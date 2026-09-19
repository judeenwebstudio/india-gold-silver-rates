import { LegalPage } from "@/components/legal/LegalPage";
import { legalMetadata } from "@/lib/legal-metadata";
import { CONTACT_EMAIL } from "@/lib/footer-config";
import { DeletionForm } from "./DeletionForm";

export const metadata = legalMetadata("Delete Your RateStack Account", "Request permanent deletion of your RateStack account and eligible personal data.", "/account-deletion");

export default function Page() {
  return <LegalPage title="Delete Your RateStack Account" intro="Registered users of the RateStack app and website can request permanent deletion of their RateStack account and associated personal data. RateStack provides this request page without requiring login.">
    <section><h2>How deletion works</h2><p>Submit your registered email address or mobile number below. The RateStack team reviews requests manually and contacts you using details already registered to the account to verify ownership and obtain your confirmation before permanent deletion. Submitting this form does not delete or disable an account. We may need to resolve outstanding orders, balances, refunds, or disputes before completing the request.</p></section>
    <DeletionForm />
    <section><h2>Data covered by your request</h2><p>After verification and review, we remove eligible account profile information, sign-in credentials and linked sign-in details, saved delivery addresses, preferences, wishlists, and notification/device registrations. We will explain any information that must be retained and confirm the outcome through your verified contact channel.</p></section>
    <section><h2>Records that may be retained</h2><p>Transaction, order, invoice, receipt, payment, refund, savings-scheme ledger, and related identity or delivery records may need to remain for legal, tax, fraud-prevention, accounting, or dispute-resolution requirements. Information required to maintain those records is excluded from immediate deletion. Retention depends on the record and applicable obligations; this request does not promise deletion of required financial records or immediate removal from backups.</p></section>
    <section><h2>Request records and assistance</h2><p>Unverified requests are removed from the request queue after 30 days during routine queue processing. If you cannot access your registered contact details, or need help with a request, email <a className="text-amber-800 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Alternative ownership verification will be required; never send your password.</p></section>
  </LegalPage>;
}
