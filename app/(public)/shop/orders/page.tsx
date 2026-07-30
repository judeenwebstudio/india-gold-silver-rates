import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { CustomerDashboard } from "@/components/customer/CustomerDashboard";

export default function Page() {
  return <div className="min-h-screen bg-[#0f0d0b] text-stone-100"><Header/><CustomerDashboard/><Footer/></div>;
}
