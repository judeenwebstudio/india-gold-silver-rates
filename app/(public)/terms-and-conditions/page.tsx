import { LegalPage } from "@/components/legal/LegalPage"; import { CONTACT_EMAIL } from "@/lib/footer-config"; import { legalMetadata } from "@/lib/legal-metadata";
export const metadata = legalMetadata("Terms & Conditions", "Terms governing use of RateStack accounts, rates, orders, payments and delivery.", "/terms-and-conditions");
const sections = [
  ["Website usage", "Use RateStack lawfully and do not interfere with its operation, security, content, or other users."],
  ["Accounts", "You are responsible for accurate registration information, protecting your sign-in credentials, and activity performed through your account."],
  ["Products and pricing", "Products remain subject to availability. Bullion prices fluctuate continuously; the price confirmed with an order applies even if the displayed market rate changes later."],
  ["Orders and payments", "An order is accepted only after successful payment verification and confirmation. Razorpay or PhonePe may process payments under their respective terms."],
  ["Delivery information", "You must provide a complete, accurate, serviceable delivery address. Dispatch, tracking, and delivery remain subject to the Shipping Policy and carrier conditions."],
  ["Cancellation", "Cancellation is not guaranteed after payment confirmation or processing has begun. Completed purchases are governed by the Refund Policy and applicable law."],
  ["Intellectual property", "RateStack branding, interface, text, and original materials may not be copied or commercially reused without permission."],
  ["Liability", "To the extent permitted by law, RateStack is not liable for losses caused by market movements, inaccurate customer information, third-party outages, carrier delays, or events outside reasonable control."],
  ["Governing law", "These terms are governed by applicable Indian law. Courts with legally applicable jurisdiction will handle disputes."],
];
export default function Page() { return <LegalPage title="Terms & Conditions" intro="These terms describe the conditions for using RateStack and placing direct coin orders.">{sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}<section><h2>Contact</h2><p>Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-800 underline">{CONTACT_EMAIL}</a>.</p></section></LegalPage>; }
