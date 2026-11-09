import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import AdminNavigation from "@/components/admin/AdminNavigation";
import StaffSignOut from "@/components/admin/StaffSignOut";
import VehiclePhotoUpload from "@/components/admin/VehiclePhotoUpload";
import VehicleForm from "@/components/admin/VehicleForm";
import { getAuthorizedVehicleForEdit } from "@/lib/admin/vehicle-mutation-service";
import { StaffAuthorizationError } from "@/lib/auth/staff-session";

import "../../../admin.css";

export const metadata = {
  title: "Edit Car | Ghana Auto Admin",
  robots: { index: false, follow: false },
};

function EditVehicleContent({ vehicle }) {
  return (
    <div className="admin-dashboard">
      <AdminNavigation activeSection="Cars" />
      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <p className="admin-eyebrow">ADMINISTRATION</p>
            <h1>Edit draft car</h1>
          </div>
          <span className="admin-demo-label">Slug: {vehicle.slug}</span>
        </div>
        <section className="admin-panel">
          <p className="admin-panel-intro">
            Publishing, status, and featured controls are managed in a separate administrator workflow.
          </p>
          <VehicleForm vehicle={vehicle} />
        </section>
        <section className="admin-panel">
          <VehiclePhotoUpload
            initialImages={vehicle.images}
            key={vehicle.images.map((image) => image.id).join(":")}
            vehicleId={vehicle.id}
          />
        </section>
      </div>
    </div>
  );
}

async function EditVehiclePageContent({ params }) {
  const { id } = await params;
  let vehicle;

  try {
    vehicle = await getAuthorizedVehicleForEdit(id);
  } catch (error) {
    if (error instanceof StaffAuthorizationError) redirect("/admin");
    throw error;
  }

  if (!vehicle) notFound();

  return <EditVehicleContent vehicle={vehicle} />;
}

export default function EditVehiclePage({ params }) {
  return (
    <Suspense fallback={null}>
      <EditVehiclePageContent params={params} />
    </Suspense>
  );
}
