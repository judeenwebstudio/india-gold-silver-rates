import { LegalPage } from "@/components/legal/LegalPage";
import { BIS_CERTIFICATE, CONTACT_EMAIL } from "@/lib/footer-config";
import { legalMetadata } from "@/lib/legal-metadata";
export const metadata = legalMetadata("About Us", "Learn how RateStack provides live bullion rates and direct coin purchase options.", "/about-us");
export default function Page() { return <LegalPage title="About Us" intro="RateStack is a digital platform for clear gold and silver rate information and selected direct coin purchases." showLogo>
  <section><h2>What RateStack provides</h2><p>RateStack provides live gold and silver rate information and enables customers to purchase selected Gold 22K Coins and Silver Coins through a secure online experience. Shop pricing uses the live Tiruchirappalli rate together with the displayed service charge and GST.</p></section>
  <section><h2>Transparent information</h2><p>City rates may be indicative calculations derived from a national source rate and configured local adjustments. Source and calculation labels are shown wherever relevant. RateStack does not promise investment returns.</p></section>
  <section><h2>Certificate and contact</h2><p className="font-bold">BIS Certificate No: {BIS_CERTIFICATE}</p><p>Questions may be sent to <a className="text-amber-800 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p></section>
</LegalPage>; }
