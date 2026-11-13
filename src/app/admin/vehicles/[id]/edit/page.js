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

function EditVehicleContent({ vehicle, mode, notice }) {
  const heading = mode === "published"
    ? "Edit live car"
    : mode === "reserved"
      ? "Manage reserved car"
      : "Edit draft car";
  return (
    <div className="admin-dashboard">
      <AdminNavigation activeSection="Cars" />
      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <p className="admin-eyebrow">ADMINISTRATION</p>
            <h1>{heading}</h1>
          </div>
          <span className="admin-context-label">Slug: {vehicle.slug}</span>
        </div>
        <section className="admin-panel">
          {notice && <p className="admin-success-message" role="status">Changes saved successfully.</p>}
          <p className="admin-panel-intro">
            Publishing and stock-status controls are managed separately. Stock code, slug,
            visibility, and featured status cannot be edited here.
          </p>
          <VehicleForm vehicle={vehicle} mode={mode} />
        </section>
        {mode !== "reserved" && (
          <section className="admin-panel">
            <VehiclePhotoUpload
              initialImages={vehicle.images}
              key={vehicle.images.map((image) => image.id).join(":")}
              vehicleId={vehicle.id}
            />
          </section>
        )}
      </div>
    </div>
  );
}

async function EditVehiclePageContent({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  let result;

  try {
    result = await getAuthorizedVehicleForEdit(id);
  } catch (error) {
    if (error instanceof StaffAuthorizationError) redirect("/admin");
    throw error;
  }

  if (!result) notFound();

  return <EditVehicleContent vehicle={result.vehicle} mode={result.mode} notice={query?.notice} />;
}

export default function EditVehiclePage({ params, searchParams }) {
  return (
    <Suspense fallback={null}>
      <EditVehiclePageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
