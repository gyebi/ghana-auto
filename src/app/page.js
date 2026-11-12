
import { Suspense } from "react";
import HomeHero from "@/components/home/HomeHero";
import HomeCarShowcase, {
  HomeCarShowcaseFallback,
} from "@/components/home/HomeCarShowcase";
import HomeServices from "@/components/home/HomeServices";

export default function HomePage() {
  return (
    <>
      <HomeHero />

      <Suspense fallback={<HomeCarShowcaseFallback />}>
        <HomeCarShowcase />
      </Suspense>

      <HomeServices />
    </>
  );
}
