import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import AdminNavigation from "@/components/admin/AdminNavigation";
import { getCreatedVehicleConfirmationLinks } from "@/lib/admin/vehicle-creation-routing";
import { getAuthorizedVehicleCreationConfirmation } from "@/lib/admin/vehicle-mutation-service";
import { StaffAuthorizationError } from "@/lib/auth/staff-session";

import "../../../admin.css";

export const metadata = {
  title: "Car Draft Saved | Ghana Auto Admin",
  robots: { index: false, follow: false },
};

function CreatedCarContent({ car }) {
  const links = getCreatedVehicleConfirmationLinks(car.id);

  return (
    <div className="admin-dashboard">
      <AdminNavigation activeSection="Cars" />
      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <p className="admin-eyebrow">ADMINISTRATION</p>
            <h1>Car Draft Saved Successfully!</h1>
          </div>
        </div>

        <section aria-labelledby="created-car-summary" className="admin-panel admin-confirmation-panel">
          <div aria-live="polite" className="admin-confirmation-status" role="status">
            <span aria-hidden="true">✓</span>
            Draft saved
          </div>
          <h2 id="created-car-summary">
            {car.year} {car.make} {car.model}
          </h2>
          <dl className="admin-confirmation-details">
            <div>
              <dt>Stock code</dt>
              <dd>{car.stockCode}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>DRAFT</dd>
            </div>
            <div>
              <dt>Visibility</dt>
              <dd>Unpublished</dd>
            </div>
          </dl>

          <nav aria-label="Draft saved actions" className="admin-confirmation-actions">
            <Link href={links.addAnother}>+ Add Another Car</Link>
            <Link href={links.edit}>Edit This Car</Link>
            <Link href={links.inventory}>View Inventory</Link>
          </nav>
        </section>
      </div>
    </div>
  );
}

async function CreatedCarPageContent({ params }) {
  const { id } = await params;
  let car;

  try {
    car = await getAuthorizedVehicleCreationConfirmation(id);
  } catch (error) {
    if (error instanceof StaffAuthorizationError) redirect("/admin");
    throw error;
  }

  if (!car) notFound();

  return <CreatedCarContent car={car} />;
}

export default function CreatedCarPage({ params }) {
  return (
    <Suspense fallback={null}>
      <CreatedCarPageContent params={params} />
    </Suspense>
  );
}
