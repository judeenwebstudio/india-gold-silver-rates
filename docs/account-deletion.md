# Account deletion requests

Public URL: https://ratestack.in/account-deletion

## Implemented scope

The public form accepts one registered email address or Indian mobile number. POST
`/api/account-deletion` stores it in the existing PostgreSQL/Prisma backend. It
does not look up users, send messages, change authentication, or delete accounts.
Responses do not disclose account existence. No admin API or secret is sent to
the browser. Origin checks, a 2 KiB stream limit, validation, a honeypot,
deduplication, and database-serialized admission limits protect intake. Limits
are five accepted requests per source IP per hour and 100 globally per hour.
Only HMAC hashes of IP addresses are stored; AUTH_SECRET is required. Configure
the reverse proxy to replace untrusted X-Forwarded-For headers. The global cap
also applies when IP headers cannot be trusted. Consider edge-level request
limits for volumetric attacks.

The queue is `/admin/account-deletion`, protected by the existing active-admin
and CUSTOMER_DATA_FULL (super-admin) checks. Review mutations use server actions,
the existing origin check, and transactional audit logging. Recording verification
only changes the request; it cannot remove an account. Closing is for invalid or
withdrawn requests, and erases the submitted contact and IP hash.

## Required operations before publishing this URL in Google Play

1. Apply the migration using the normal deployment migration process
   (`pnpm exec prisma migrate deploy`), then generate the client/build the app.
   This task does not apply a migration to a production database.
2. Assign a RateStack privacy operator to check the queue daily and handle
   info@ratestack.in. There is no automatic notification or delivery promise.
3. Test anonymous submission and authorized review in staging, including
   account owners who use only a phone number. Confirm public GET works without
   cookies and POST works behind the production proxy with matching Origin.
4. Establish and approve the manual fulfilment procedure described below. The
   repository had no account-deletion executor; this change implements request
   intake and review, not a permanent-deletion engine. Do not represent queue
   verification as completed deletion or claim this alone proves Play compliance.

## Ownership verification and manual fulfilment

Match the supplied contact against existing customer records privately. Contact
the owner only via a channel already registered on that account, independently
of any new contact information supplied later. Require a reply/confirmation from
the registered email or a verified callback/challenge to the registered phone;
an asserted address, caller ID alone, or knowledge of an order number is not
proof. Never ask for a password. Escalate inaccessible or ambiguous contacts for
an approved alternative verification procedure. Record verification only after
ownership and the explicit permanent-deletion request are confirmed.

Review open orders, savings balances, refunds, and disputes before fulfilment.
An authorized operator must agree the record-specific retention decision with
the business/legal owner; this feature invents no statutory retention period.
Preserve required ShopOrder, payment, invoice/receipt, refund, scheme enrollment,
ledger, audit, and necessary KYC/identity/delivery evidence. Do not cascade-delete
SchemeUser: financial relations are intentionally restrictive.

Eligible profile fields, password/PIN hashes, AuthAccount links, saved addresses,
GST profiles where not required evidence, wishlists, notification preferences,
device registrations, activity data, and auth/reset tokens must be covered by the
approved deletion operation. Review free-text/JSON data, external providers,
notification queues, logs, and backups too. Existing customer JWTs are stateless
and some routes only validate their signature: deactivating/anonymizing a row is
NOT sufficient session revocation. A safe permanent-deletion executor therefore
needs a separately reviewed session-revocation strategy before use. No auth
behaviour has been changed in this request-page implementation.

Contact the verified owner with the outcome and retained data/categories and
retention explanation. Do not mark the request closed using the invalid/withdrawn
action to imply fulfilment. Keep verified requests queued until the approved
fulfilment process records completion. Never delete an account merely because a
public request was filed.

## Request retention

Intake and authorized queue reads remove unverified requests older than 30 days.
This is lazy cleanup, not a scheduled job; daily queue review is required. IP
hashes are cleared on review. Closed requests retain a keyed contact hash,
timestamps and reviewer reference for abuse/security and handling evidence;
verified requests retain the identifier needed for follow-up. Include reviewed
requests and audit evidence in the business's retention schedule.
