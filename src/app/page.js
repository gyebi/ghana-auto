
import { Suspense } from "react";
import HomeHero from "@/components/home/HomeHero";
import HomeCarShowcase, {
  HomeCarShowcaseFallback,
} from "@/components/home/HomeCarShowcase";

export default function HomePage() {
  return (
    <>
      <HomeHero />

      <Suspense fallback={<HomeCarShowcaseFallback />}>
        <HomeCarShowcase />
      </Suspense>
    </>
  );
}
