import { Suspense } from "react";
import { redirect } from "next/navigation";

import AdminNavigation from "@/components/admin/AdminNavigation";
import StaffSignOut from "@/components/admin/StaffSignOut";
import NewVehicleForm from "@/components/admin/NewVehicleForm";
import {
  StaffAuthorizationError,
  requireActiveStaffSession,
} from "@/lib/auth/staff-session";

import "../../admin.css";

export const metadata = {
  title: "Create Car | Ghana Auto Admin",
  robots: { index: false, follow: false },
};

function CreateVehiclePageContent({ staffUser }) {
  return (
    <div className="admin-dashboard">
      <AdminNavigation activeSection="Cars" />
      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <p className="admin-eyebrow">ADMINISTRATION</p>
            <h1>Create draft car</h1>
          </div>
        </div>
        <div className="admin-staff-bar">
          <span>
            Signed in as {staffUser.displayName || staffUser.email} ({staffUser.role})
          </span>
          <StaffSignOut />
        </div>
        <section className="admin-panel">
          <p className="admin-panel-intro">
            New cars remain unpublished drafts until an administrator completes a later publishing workflow.
          </p>
          <NewVehicleForm />
        </section>
      </div>
    </div>
  );
}

async function CreateVehicleContent() {
  let staffUser;

  try {
    staffUser = await requireActiveStaffSession();
  } catch (error) {
    if (error instanceof StaffAuthorizationError) redirect("/admin");
    throw error;
  }

  return <CreateVehiclePageContent staffUser={staffUser} />;
}

export default function CreateVehiclePage() {
  return (
    <Suspense fallback={null}>
      <CreateVehicleContent />
    </Suspense>
  );
}
