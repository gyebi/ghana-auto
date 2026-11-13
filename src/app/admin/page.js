
import Link from "next/link";
import { Suspense } from "react";

import StaffLogin from "@/components/admin/StaffLogin";
import StaffSignOut from "@/components/admin/StaffSignOut";
import AdminNavigation from "@/components/admin/AdminNavigation";
import { StaffAuthorizationError } from "@/lib/auth/staff-session";
import { getAuthorizedAdminVehicleDashboard } from "@/lib/admin/vehicle-listing";
import "./admin.css";

export const metadata = {
  title: "Administration | Ghana Auto",
  robots: {
    index: false,
    follow: false,
  },
};

function AdminDashboard({ staffUser, statistics }) {
  const dashboardStatistics = [
    { label: "Total Cars", value: statistics.total },
    { label: "Publicly Available", value: statistics.publiclyAvailable },
    { label: "Reserved Cars", value: statistics.reserved },
    { label: "Sold Cars", value: statistics.sold },
  ];

  return (
    <div className="admin-dashboard">
      <AdminNavigation activeSection="Dashboard" />

      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <p className="admin-eyebrow">ADMINISTRATION</p>
            <h1>Dashboard Overview</h1>
          </div>

          <span className="admin-context-label">Live inventory</span>
        </div>

        <div className="admin-notice" role="note">
          These counts are read from the current inventory. Availability means
          a listing is published and publicly visible.
        </div>

        <div className="admin-staff-bar">
          <span>
            Signed in as {staffUser.displayName || staffUser.email} ({staffUser.role})
          </span>
          <StaffSignOut />
        </div>

        <section
          className="admin-stat-grid"
          aria-label="Live dealership statistics"
        >
          {dashboardStatistics.map((stat) => (
            <article key={stat.label} className="admin-stat-card">
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Car Management</h2>
              <p>
                Add, update, and manage car listings
                from one dashboard.
              </p>
            </div>
          </div>

          <div className="admin-empty-state">
            <span aria-hidden="true">🚘</span>
            <h3>Manage inventory</h3>
            <p>
              Review listings, create drafts, and manage stock status in the
              car inventory area.
            </p>
            <Link href="/admin/vehicles" className="admin-vehicle-create-link">
              Open Car Inventory
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminLoading() {
  return (
    <section className="admin-login" aria-live="polite">
      <div className="admin-login-card">
        <p className="admin-eyebrow">STAFF ACCESS</p>
        <h1>Ghana Auto Administration</h1>
        <p>Checking your staff session…</p>
      </div>
    </section>
  );
}

async function getDashboardForRender() {
  // This is intentionally below Suspense: Cache Components requires the
  // request-time session check to stream rather than enter a shared shell.
  // The helper rechecks Firebase revocation and Neon staff state before it
  // reads live inventory totals.
  try {
    return await getAuthorizedAdminVehicleDashboard();
  } catch (error) {
    if (error instanceof StaffAuthorizationError) return null;
    throw error;
  }
}

async function AdminEntry() {
  const dashboard = await getDashboardForRender();
  return dashboard ? <AdminDashboard {...dashboard} /> : <StaffLogin />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminEntry />
    </Suspense>
  );
}
