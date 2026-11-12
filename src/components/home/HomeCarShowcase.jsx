import Link from "next/link";
import HomeCarPhotoCard from "@/components/home/HomeCarPhotoCard";
import { getHomepagePhotoCardData } from "@/lib/homepage-photo";
import { getPublicHomepageVehicles } from "@/lib/db/vehicle-repository";
import "./HomeCarShowcase.css";

function ShowcaseHeading() {
  return (
    <div className="home-showcase-heading">
      <div>
        <p className="home-showcase-eyebrow">FRESH INVENTORY</p>
        <h2 id="home-showcase-title">Explore Our Cars</h2>
        <p>
          Browse a selection of vehicles currently available from Ghana Auto.
        </p>
      </div>

      <Link className="home-showcase-link" href="/cars">
        View All Cars
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

export function HomeCarShowcaseFallback() {
  return (
    <section className="home-showcase" aria-labelledby="home-showcase-title">
      <div className="home-showcase-container">
        <ShowcaseHeading />
        <div className="home-showcase-loading" role="status">
          Loading available cars...
        </div>
      </div>
    </section>
  );
}

export default async function HomeCarShowcase() {
  const vehicles = await getPublicHomepageVehicles();
  const photoVehicles = vehicles
    .map((vehicle) => {
      const photo = getHomepagePhotoCardData(vehicle);

      return photo ? { vehicle, ...photo } : null;
    })
    .filter(Boolean);

  return (
    <section className="home-showcase" aria-labelledby="home-showcase-title">
      <div className="home-showcase-container">
        <ShowcaseHeading />

        {photoVehicles.length > 0 ? (
          <div className="home-showcase-grid">
            {photoVehicles.map(({ vehicle, image, href }) => (
              <HomeCarPhotoCard
                key={vehicle.id}
                vehicle={vehicle}
                image={image}
                href={href}
              />
            ))}
          </div>
        ) : (
          <div className="home-showcase-empty">
            <h3>No cars are currently available</h3>
            <p>Please check back soon for our latest arrivals.</p>
          </div>
        )}
      </div>
    </section>
  );
}
