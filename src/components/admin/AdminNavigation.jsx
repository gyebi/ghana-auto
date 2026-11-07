import Link from "next/link";

const navigation = [
  { label: "Dashboard", icon: "▦", href: "/admin" },
  { label: "Vehicles", icon: "▤", href: "/admin/vehicles" },
  { label: "Enquiries", icon: "✉" },
  { label: "Staff", icon: "♙" },
  { label: "Settings", icon: "⚙" },
];

export default function AdminNavigation({ activeSection }) {
  return (
    <aside className="admin-sidebar">
      <Link href="/" className="admin-brand">
        GHANA <span>AUTO</span>
      </Link>

      <p className="admin-sidebar-caption">DEALERSHIP MANAGEMENT</p>

      <nav aria-label="Admin sections">
        {navigation.map((item) => {
          const className =
            item.label === activeSection
              ? "admin-nav-item active"
              : "admin-nav-item";
          const content = (
            <>
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </>
          );

          return item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className={className}
              aria-current={item.label === activeSection ? "page" : undefined}
            >
              {content}
            </Link>
          ) : (
            <span key={item.label} className={className}>
              {content}
            </span>
          );
        })}
      </nav>

      <Link href="/" className="admin-back-link">
        ← Back to Website
      </Link>
    </aside>
  );
}
