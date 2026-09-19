ALTER TABLE "SchemeUser" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "PasswordResetOtp" ADD COLUMN "userId" TEXT;
UPDATE "PasswordResetOtp" AS p SET "userId" = u.id FROM "SchemeUser" AS u WHERE u.phone = p."mobileNumber";
CREATE INDEX "PasswordResetOtp_userId_idx" ON "PasswordResetOtp"("userId");

ALTER TABLE "AccountDeletionRequest"
  ALTER COLUMN "contactHash" DROP NOT NULL,
  ADD COLUMN "customerId" TEXT,
  ADD COLUMN "verificationMethod" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "policyVersion" TEXT,
  ADD COLUMN "retainKyc" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "retainEvidence" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "retainedEvidenceJson" JSONB,
  ADD COLUMN "retentionReviewAt" TIMESTAMP(3);
CREATE INDEX "AccountDeletionRequest_customerId_status_idx" ON "AccountDeletionRequest"("customerId", "status");
ALTER TABLE "AccountDeletionRequest" DROP CONSTRAINT "AccountDeletionRequest_status_check";
ALTER TABLE "AccountDeletionRequest" ADD CONSTRAINT "AccountDeletionRequest_status_check"
  CHECK (status IN ('PENDING', 'VERIFIED', 'APPROVED', 'COMPLETED', 'CLOSED'));
-- Old attestations were not bound to a customer ID/channel. Require verification
-- again rather than trusting an email/phone that may since have changed owners.
UPDATE "AccountDeletionRequest" SET status = 'PENDING', "verifiedAt" = NULL, "reviewedBy" = NULL WHERE status = 'VERIFIED';

-- Deleted IDs never become loginable again, even through stale requests or
-- ad-hoc profile updates. Unique email/phone values are freed for a NEW ID.
CREATE FUNCTION ratestack_deleted_customer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."deletedAt" IS NOT NULL AND (NEW."deletedAt" IS DISTINCT FROM OLD."deletedAt" OR NEW.id <> OLD.id) THEN
    RAISE EXCEPTION 'Deleted customer identity is immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW."deletedAt" IS NOT NULL AND (
    NEW."isActive" OR NEW."accountStatus" <> 'DELETED' OR NEW."fullName" <> 'Deleted RateStack account'
    OR NEW.phone IS NOT NULL OR NEW.email IS NOT NULL OR NEW."passwordHash" IS NOT NULL
    OR NEW."pinHash" IS NOT NULL OR NEW."profileImageUrl" IS NOT NULL OR NEW.address IS NOT NULL
    OR NEW.city IS NOT NULL OR NEW.state IS NOT NULL OR NEW.pincode IS NOT NULL
    OR NEW."mobileVerifiedAt" IS NOT NULL OR NEW."emailVerifiedAt" IS NOT NULL OR NEW."lastLoginAt" IS NOT NULL
    OR NEW."preferredLoginMethod" <> 'NONE'
  ) THEN RAISE EXCEPTION 'Deleted customer cannot be restored' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER deleted_customer_guard BEFORE UPDATE ON "SchemeUser" FOR EACH ROW EXECUTE FUNCTION ratestack_deleted_customer_guard();

-- Resolve a financial/personal row's account without storing any identifier.
CREATE FUNCTION ratestack_row_customer(row_data JSONB, linkage TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE customer TEXT;
BEGIN
  CASE linkage
    WHEN 'userId' THEN customer := row_data->>'userId';
    WHEN 'customerId' THEN customer := row_data->>'customerId';
    WHEN 'actorId' THEN customer := row_data->>'actorId';
    WHEN 'orderId' THEN SELECT "userId" INTO customer FROM "ShopOrder" WHERE id = row_data->>'orderId';
    WHEN 'shopOrderId' THEN SELECT "userId" INTO customer FROM "ShopOrder" WHERE id = row_data->>'shopOrderId';
    WHEN 'enrollmentId' THEN SELECT "userId" INTO customer FROM "SchemeEnrollment" WHERE id = row_data->>'enrollmentId';
    WHEN 'redemptionRequestId' THEN SELECT "userId" INTO customer FROM "RedemptionRequest" WHERE id = row_data->>'redemptionRequestId';
    WHEN 'outbox' THEN
      customer := row_data->>'customerId';
      IF customer IS NULL THEN SELECT "userId" INTO customer FROM "ShopOrder" WHERE id = row_data->>'shopOrderId'; END IF;
  END CASE;
  RETURN customer;
END $$;

-- FOR SHARE serializes against the deletion transaction's FOR UPDATE lock.
-- Thus pre-existing writes finish BEFORE cleanup, or are rejected AFTER it.
CREATE FUNCTION ratestack_personal_write_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE customer TEXT; deleted TIMESTAMP; present BOOLEAN;
BEGIN
  customer := ratestack_row_customer(to_jsonb(NEW), TG_ARGV[0]);
  IF customer IS NULL AND TG_TABLE_NAME IN ('NotificationOutbox', 'NotificationLog') THEN RETURN NEW; END IF;
  SELECT "deletedAt", true INTO deleted, present FROM "SchemeUser" WHERE id = customer FOR SHARE;
  IF NOT COALESCE(present, false) OR deleted IS NOT NULL THEN
    RAISE EXCEPTION 'Customer is unavailable' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'PasswordResetOtp' AND NOT EXISTS (
    SELECT 1 FROM "SchemeUser" WHERE id = customer AND phone = to_jsonb(NEW)->>'mobileNumber'
  ) THEN RAISE EXCEPTION 'Reset token account mismatch' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;

DO $$ DECLARE pair TEXT[]; BEGIN
  FOREACH pair SLICE 1 IN ARRAY ARRAY[
    ['AuthAccount','userId'], ['EmailAuthToken','userId'], ['PasswordResetOtp','userId'], ['DeliveryAddress','userId'],
    ['CustomerGSTProfile','customerId'], ['CustomerPlatformActivity','customerId'], ['CustomerWishlist','customerId'],
    ['CustomerNotificationPreference','customerId'], ['RateAlertPreference','customerId'], ['PushDeviceToken','customerId'],
    ['CustomerNotification','customerId'], ['NotificationOutbox','outbox'], ['NotificationLog','userId'], ['Nominee','enrollmentId']
  ] LOOP
    EXECUTE format('CREATE TRIGGER personal_write_guard BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION ratestack_personal_write_guard(%L)', pair[1], pair[2]);
  END LOOP;
END $$;

-- Financial records survive. New orders/enrollments/payments/redemptions cannot
-- be started for a deleted account; webhook changes to existing money/status
-- remain possible. Previously approved evidence is frozen, never repopulated
-- from a delayed webhook. New evidence for deleted accounts is minimized.
CREATE FUNCTION ratestack_financial_write_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE customer TEXT; deleted TIMESTAMP; fields TEXT[]; field TEXT; patch JSONB := '{}'::jsonb; defaults JSONB;
BEGIN
  customer := ratestack_row_customer(to_jsonb(NEW), TG_ARGV[0]);
  SELECT "deletedAt" INTO deleted FROM "SchemeUser" WHERE id = customer FOR SHARE;
  IF deleted IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME IN ('ShopOrder','SchemeEnrollment','PaymentOrder','RedemptionRequest') AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Deleted customer cannot start a transaction' USING ERRCODE = '23514';
  END IF;
  defaults := TG_ARGV[1]::jsonb;
  fields := ARRAY(SELECT jsonb_object_keys(defaults));
  FOREACH field IN ARRAY fields LOOP
    patch := patch || jsonb_build_object(field, CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)->field ELSE defaults->field END);
  END LOOP;
  NEW := jsonb_populate_record(NEW, patch);
  RETURN NEW;
END $$;

CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "ShopOrder" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('userId', '{"customerName":null,"customerPhone":null,"customerEmail":null,"addressLine1":null,"addressLine2":null,"landmark":null,"deliveryCity":null,"deliveryDistrict":null,"deliveryState":null,"deliveryPincode":null,"deliveryCountry":null,"addressType":null,"gstBusinessName":null,"gstNumber":null,"gstBillingAddress":null,"publicTrackingUrl":null,"labelUrl":null,"manifestUrl":null,"shiprocketInvoiceUrl":null,"shipmentTimelineJson":null,"failureMessage":null,"cancellationReason":null,"shiprocketFailureReason":null,"shiprocketRawStatus":null}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "SchemeEnrollment" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('userId', '{}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "PaymentOrder" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('userId', '{}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "RedemptionRequest" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('userId', '{"deliveryAddressJson":null,"adminNotes":null}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "PaymentVerification" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('orderId', '{"responseJson":null,"resultMessage":"Personal details removed"}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "AdminOrderNote" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('orderId', '{"body":"Personal details removed"}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "OrderStatusHistory" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('orderId', '{"publicMessage":"Personal details removed","internalNote":null}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "ShipmentTrackingEvent" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('orderId', '{"publicMessage":"Personal details removed","internalNote":null}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "LogisticsWebhookEvent" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('shopOrderId', '{"payloadJson":{},"failureReason":null,"statusText":null}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "ShiprocketOperation" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('shopOrderId', '{"responseReference":null,"errorMessage":null}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "ShopRefund" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('orderId', '{"reason":"Personal details removed","failureReason":null}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "ManualPaymentQueue" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('enrollmentId', '{"proofDocumentUrl":null,"rejectionReason":null}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "RefundRequest" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('enrollmentId', '{"reasoning":"Personal details removed"}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "SchemeLedgerEntry" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('enrollmentId', '{"metadata":null}');
CREATE TRIGGER financial_write_guard BEFORE INSERT OR UPDATE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION ratestack_financial_write_guard('actorId', '{"detailsJson":null,"ipAddress":null}');
