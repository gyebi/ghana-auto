import Image from "next/image";
import Link from "next/link";
import { getVehicleTitle } from "@/lib/vehicle-format";
import "./HomeCarPhotoCard.css";

export default function HomeCarPhotoCard({ vehicle, image, href }) {
  if (!image || !href) return null;

  const title = getVehicleTitle(vehicle);

  return (
    <Link
      className="home-car-photo-card"
      href={href}
      aria-label={`View details for ${title}`}
    >
      <Image
        src={image}
        alt={`Photo of ${title}`}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"
        className="home-car-photo-card-image"
      />
    </Link>
  );
}
