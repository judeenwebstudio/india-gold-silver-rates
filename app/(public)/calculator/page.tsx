import { CalculatorExperience } from "@/components/CalculatorExperience";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCityDisplayRates, getPublicLocations } from "@/lib/city-rate-service";

export const dynamic = "force-dynamic";

export default async function CalculatorPage(){
  const states=await getPublicLocations();
  const city=states.flatMap(state=>state.cities).find(item=>item.slug==="chennai")??states[0]?.cities[0];
  if(!city)throw new Error("No active city is configured for the calculator.");
  const snapshot=await getCityDisplayRates(city.slug);
  return <div className="min-h-screen bg-[#fbfaf7]"><Header/><main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><CalculatorExperience states={states} initialSnapshot={snapshot}/></main><Footer/></div>;
}
