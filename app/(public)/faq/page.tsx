import { LegalPage } from "@/components/legal/LegalPage"; import { CONTACT_EMAIL } from "@/lib/footer-config"; import { legalMetadata } from "@/lib/legal-metadata";
export const metadata = legalMetadata("FAQ", "Answers about RateStack coin products, pricing, shipping, payments, accounts and orders.", "/faq");
const faqs = [
  ["Which products are available?", "The Shop currently offers selected Gold 22K Coins and Silver Coins in the displayed weight options."],
  ["Which rate is used for pricing?", "Shop product pricing uses the live Tiruchirappalli rate for all customers, regardless of delivery location."],
  ["Why is the Tiruchirappalli rate used?", "It is the configured reference location for RateStack Shop pricing, providing one consistent basis for all customers."],
  ["What are the service charges?", "A service charge is calculated from the metal value and shown separately before payment."],
  ["Is GST included?", "Yes. GST at 3% is itemised in the pricing breakdown and included in Total Payable."],
  ["Is shipping free?", "Shipping Cost is currently displayed as FREE and adds ₹0 to Total Payable."],
  ["Can I cancel or get a refund?", "Successfully completed bullion purchases are generally final and non-refundable, subject to applicable law and the exceptions described in the Refund Policy."],
  ["Which payment gateways are supported?", "Razorpay is the primary configured gateway and PhonePe is the secondary gateway, subject to current availability."],
  ["How do I track my order?", "Use My Orders for the latest recorded order status and tracking information where available."],
  ["Can I buy from any district in India?", "You may place an order where the selected address is serviceable. Delivery coverage is determined during fulfilment."],
  ["How do I contact support?", `Email ${CONTACT_EMAIL}.`],
  ["Is Google Sign-In available?", "Yes, Google Sign-In is available as an additional account authentication option when correctly configured."],
  ["How do I view My Orders?", "Sign in and open My Orders from the Shop or your customer account."],
];
export default function Page() { return <LegalPage title="Frequently Asked Questions" intro="Clear answers about RateStack rates, products, orders, and support.">{faqs.map(([q, a]) => <section key={q}><h2>{q}</h2><p>{a}</p></section>)}</LegalPage>; }
