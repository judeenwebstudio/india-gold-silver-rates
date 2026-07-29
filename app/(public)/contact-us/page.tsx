import { LegalPage } from "@/components/legal/LegalPage"; import { BIS_CERTIFICATE, CONTACT_EMAIL } from "@/lib/footer-config"; import { legalMetadata } from "@/lib/legal-metadata";
export const metadata = legalMetadata("Contact Us", "Contact RateStack customer support by email.", "/contact-us");
export default function Page() { return <LegalPage title="Contact Us" intro="For account, rate, payment, order, delivery, or policy support, contact RateStack by email.">
  <section><h2>Email support</h2><a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex rounded-xl bg-stone-950 px-5 py-3 font-bold text-white hover:bg-amber-800">{CONTACT_EMAIL}</a></section>
  <section><h2>Certificate</h2><p className="font-bold">BIS Certificate No: {BIS_CERTIFICATE}</p></section>
</LegalPage>; }
