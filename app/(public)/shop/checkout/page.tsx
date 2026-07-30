import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShopCheckout } from "@/components/shop/ShopCheckout";

export default function Page() {
  return <div className="min-h-screen bg-[#fbfaf7]"><Header/><main className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><Suspense fallback={<p className="py-20 text-center">Loading checkout…</p>}><ShopCheckout/></Suspense></main><Footer/></div>;
}
