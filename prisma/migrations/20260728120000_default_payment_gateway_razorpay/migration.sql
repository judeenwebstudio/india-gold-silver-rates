INSERT INTO "SystemSetting" ("id", "key", "value", "updatedAt")
VALUES ('payment-gateway-default', 'activePaymentGateway', 'RAZORPAY', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
