import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ShopCatalogue } from "@/components/shop/ShopCatalogue";

export default function ShopPage() {
  return <div className="min-h-screen bg-[#fbfaf7]"><Header/><main className="mx-auto max-w-6xl px-4 py-12"><ShopCatalogue /></main><Footer/></div>;
}
