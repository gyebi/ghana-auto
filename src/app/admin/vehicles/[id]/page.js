import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import AdminNavigation from "@/components/admin/AdminNavigation";
import StaffSignOut from "@/components/admin/StaffSignOut";
import { getAuthorizedVehicleForReadOnlyView } from "@/lib/admin/vehicle-mutation-service";
import { StaffAuthorizationError } from "@/lib/auth/staff-session";
import { formatVehiclePrice } from "@/lib/vehicle-format";

import "../../admin.css";

export const metadata = {
  title: "Car Record | Ghana Auto Admin",
  robots: { index: false, follow: false },
};

function VehicleReadOnlyContent({ vehicle }) {
  return (
    <div className="admin-dashboard">
      <AdminNavigation activeSection="Cars" />
      <div className="admin-main">
        <div className="admin-topbar">
          <div><p className="admin-eyebrow">ADMINISTRATION</p><h1>Car record</h1></div>
          <span className="admin-demo-label">{vehicle.stockCode}</span>
        </div>
        <div className="admin-staff-bar"><span>Read-only historical inventory record</span><StaffSignOut /></div>
        <section className="admin-panel">
          <h2>{vehicle.year} {vehicle.make} {vehicle.model}</h2>
          <p className="admin-panel-intro">This {vehicle.status.toLowerCase()} car cannot be changed from this page.</p>
          <dl className="admin-vehicle-read-only">
            <div><dt>Stock code</dt><dd>{vehicle.stockCode}</dd></div>
            <div><dt>Slug</dt><dd>{vehicle.slug}</dd></div>
            <div><dt>Status</dt><dd>{vehicle.status}</dd></div>
            <div><dt>Visibility</dt><dd>{vehicle.published ? "Published" : "Unpublished"}</dd></div>
            <div><dt>Price</dt><dd>{formatVehiclePrice(vehicle.price)}</dd></div>
            <div><dt>Inventory type</dt><dd>{vehicle.inventoryType.replaceAll("_", " ")}</dd></div>
            <div><dt>Photos</dt><dd>{vehicle.images.length}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}

async function VehicleReadOnlyPageContent({ params }) {
  const { id } = await params;
  let vehicle;
  try {
    vehicle = await getAuthorizedVehicleForReadOnlyView(id);
  } catch (error) {
    if (error instanceof StaffAuthorizationError) redirect("/admin");
    throw error;
  }
  if (!vehicle) notFound();
  return <VehicleReadOnlyContent vehicle={vehicle} />;
}

export default function VehicleReadOnlyPage({ params }) {
  return <Suspense fallback={null}><VehicleReadOnlyPageContent params={params} /></Suspense>;
}
