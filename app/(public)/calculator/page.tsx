import type { Metadata } from "next";

import { CalculatorExperience } from "@/components/CalculatorExperience";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCityDisplayRates, getPublicLocations } from "@/lib/city-rate-service";
import { PRODUCTION_SITE_URL } from "@/lib/legal-metadata";

export const metadata: Metadata = {
  title: { absolute: "Gold Rate Calculator: Estimate Gold Price | RateStack" },
  description:
    "Use RateStack's gold rate calculator to estimate metal value by city, purity, and weight. You can also calculate silver value from current indicative rates.",
  alternates: { canonical: `${PRODUCTION_SITE_URL}/calculator` },
};

export const dynamic = "force-dynamic";

export default async function CalculatorPage(){
  const states=await getPublicLocations();
  const city=states.flatMap(state=>state.cities).find(item=>item.slug==="chennai")??states[0]?.cities[0];
  if(!city)throw new Error("No active city is configured for the calculator.");
  const snapshot=await getCityDisplayRates(city.slug);
  return <div className="min-h-screen bg-[#fbfaf7]"><Header/><main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><CalculatorExperience states={states} initialSnapshot={snapshot}/></main><Footer/></div>;
}
