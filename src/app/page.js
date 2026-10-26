
import HomeHero from "@/components/home/HomeHero";
import { getVehicleSearchOptions } from "@/lib/vehicle-search";

export default function HomePage() {
  const searchOptions = getVehicleSearchOptions();
  return (
    <HomeHero searchOptions={searchOptions}/>
  );
}
