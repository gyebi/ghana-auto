
import Link from "next/link";
import { Suspense } from "react";

import StaffLogin from "@/components/admin/StaffLogin";
import StaffSignOut from "@/components/admin/StaffSignOut";
import AdminNavigation from "@/components/admin/AdminNavigation";
import { getCurrentStaffSession } from "@/lib/auth/staff-session";
import "./admin.css";

export const metadata = {
  title: "Admin Prototype | Ghana Auto",
  robots: {
    index: false,
    follow: false,
  },
};

const statistics = [
  { label: "Total Cars", value: "32" },
  { label: "Available Cars", value: "24" },
  { label: "Sold Cars", value: "8" },
  { label: "New Enquiries", value: "12" },
];

function AdminDashboard({ staffUser }) {
  return (
    <div className="admin-dashboard">
      <AdminNavigation activeSection="Dashboard" />

      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <p className="admin-eyebrow">ADMINISTRATION</p>
            <h1>Dashboard Overview</h1>
          </div>

          <span className="admin-demo-label">
            Demonstration data
          </span>
        </div>

        <div className="admin-notice" role="note">
          Dashboard statistics are demonstration data until live
          administrative queries are implemented. Management
          actions are not enabled in this checkpoint.
        </div>

        <div className="admin-staff-bar">
          <span>
            Signed in as {staffUser.displayName || staffUser.email} ({staffUser.role})
          </span>
          <StaffSignOut />
        </div>

        <section
          className="admin-stat-grid"
          aria-label="Sample dealership statistics"
        >
          {statistics.map((stat) => (
            <article key={stat.label} className="admin-stat-card">
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
              <small>Sample data</small>
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
            <h3>Inventory Management Coming Soon</h3>
            <p>
              Car listings will become manageable
              once authentication and database integration
              are completed.
            </p>
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

async function AdminEntry() {
  // This is intentionally below Suspense: Cache Components requires the
  // request-time session check to stream rather than enter a shared shell.
  // The helper rechecks Firebase revocation and Neon staff state on each
  // protected render.
  const session = await getCurrentStaffSession();

  if (!session) {
    return <StaffLogin />;
  }

  return <AdminDashboard staffUser={session.staffUser} />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminEntry />
    </Suspense>
  );
}
