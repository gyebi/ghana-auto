
import Link from "next/link";
import "./admin.css";

export const metadata = {
  title: "Admin Prototype | Ghana Auto",
  robots: {
    index: false,
    follow: false,
  },
};

const navigation = [
  { label: "Dashboard", icon: "▦" },
  { label: "Vehicles", icon: "▤" },
  { label: "Enquiries", icon: "✉" },
  { label: "Staff", icon: "♙" },
  { label: "Settings", icon: "⚙" },
];

const statistics = [
  { label: "Total Vehicles", value: "32" },
  { label: "Available Vehicles", value: "24" },
  { label: "Sold Vehicles", value: "8" },
  { label: "New Enquiries", value: "12" },
];

export default function AdminPage() {
  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand">
          GHANA <span>AUTO</span>
        </Link>

        <p className="admin-sidebar-caption">
          DEALERSHIP MANAGEMENT
        </p>

        <nav aria-label="Admin sections">
          {navigation.map((item, index) => (
            <span
              key={item.label}
              className={
                index === 0
                  ? "admin-nav-item active"
                  : "admin-nav-item"
              }
              aria-current={index === 0 ? "page" : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </span>
          ))}
        </nav>

        <Link href="/" className="admin-back-link">
          ← Back to Website
        </Link>
      </aside>

      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <p className="admin-eyebrow">ADMINISTRATION</p>
            <h1>Dashboard Overview</h1>
          </div>

          <span className="admin-demo-label">
            Prototype Only
          </span>
        </div>

        <div className="admin-notice" role="note">
          This is a demonstration interface using sample
          information. Authentication, live inventory, and
          management actions are not enabled.
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
              <h2>Vehicle Management</h2>
              <p>
                Add, update, and manage vehicle listings
                from one dashboard.
              </p>
            </div>
          </div>

          <div className="admin-empty-state">
            <span aria-hidden="true">🚘</span>
            <h3>Inventory Management Coming Soon</h3>
            <p>
              Vehicle listings will become manageable
              once authentication and database integration
              are completed.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
