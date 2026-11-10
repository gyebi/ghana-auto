import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import AdminNavigation from "@/components/admin/AdminNavigation";
import StaffSignOut from "@/components/admin/StaffSignOut";
import {
  StaffAuthorizationError,
} from "@/lib/auth/staff-session";
import { getAuthorizedAdminVehicleListing } from "@/lib/admin/vehicle-listing";
import { formatVehiclePrice } from "@/lib/vehicle-format";
import VehicleStatusAction from "@/components/admin/VehicleStatusActions";

import "../admin.css"

export const metadata = {
  title: "Car Inventory | Ghana Auto Admin",
  robots: {
    index: false,
    follow: false,
  },
};

const statusOptions = [
  "DRAFT",
  "AVAILABLE",
  "RESERVED",
  "SOLD",
  "ARCHIVED",
];

function getPageHref({ page, search, status }) {
  const query = new URLSearchParams();

  if (search) query.set("q", search);
  if (status) query.set("status", status);
  if (page > 1) query.set("page", String(page));

  const queryString = query.toString();

  return queryString
    ? `/admin/vehicles?${queryString}`
    : "/admin/vehicles";
}

function VehicleActions({ vehicle, role }) {
  const editHref = `/admin/vehicles/${vehicle.id}/edit`;
  const viewHref = `/admin/vehicles/${vehicle.id}`;
  const admin = role === "ADMIN";

  if (vehicle.status === "DRAFT") {
    return <div className="admin-vehicle-actions">
      <Link href={editHref}>Edit</Link>
      {admin && <VehicleStatusAction action="publish" label="Publish" vehicleId={vehicle.id} />}
    </div>;
  }
  if (vehicle.status === "AVAILABLE") {
    if (!admin) return <Link href={viewHref}>View</Link>;
    return <div className="admin-vehicle-actions">
      <Link href={editHref}>Edit</Link>
      <VehicleStatusAction action="unpublish" label="Unpublish" vehicleId={vehicle.id} />
      <VehicleStatusAction action="reserve" label="Reserve" vehicleId={vehicle.id} />
      <VehicleStatusAction action="sold" label="Mark sold" vehicleId={vehicle.id} />
    </div>;
  }
  if (vehicle.status === "RESERVED") {
    if (!admin) return <Link href={viewHref}>View</Link>;
    return <div className="admin-vehicle-actions">
      <Link href={editHref}>Manage</Link>
      <VehicleStatusAction action="sold" label="Mark sold" vehicleId={vehicle.id} />
      <VehicleStatusAction action="archive" label="Archive" vehicleId={vehicle.id} />
    </div>;
  }
  return <Link href={viewHref}>View</Link>;
}

function VehicleRows({ vehicles, role }) {
  return vehicles.map((vehicle) => (
    <tr key={vehicle.stockCode}>
      <td>{vehicle.stockCode}</td>
      <td>
        {vehicle.year} {vehicle.make} {vehicle.model}
      </td>
      <td>{formatVehiclePrice(vehicle.price)}</td>
      <td><span className="admin-vehicle-status">{vehicle.status}</span></td>
      <td>{vehicle.inventoryType.replaceAll("_", " ")}</td>
      <td>{vehicle.published ? "Published" : "Unpublished"}</td>
      <td><VehicleActions vehicle={vehicle} role={role} /></td>
    </tr>
  ));
}

function VehicleCards({ vehicles, role }) {
  return (
    <div className="admin-vehicle-cards">
      {vehicles.map((vehicle) => (
        <article key={vehicle.stockCode} className="admin-vehicle-card">
          <div>
            <p className="admin-vehicle-stock-code">{vehicle.stockCode}</p>
            <h3>{vehicle.year} {vehicle.make} {vehicle.model}</h3>
          </div>
          <dl>
            <div><dt>Price</dt><dd>{formatVehiclePrice(vehicle.price)}</dd></div>
            <div><dt>Status</dt><dd>{vehicle.status}</dd></div>
            <div><dt>Inventory</dt><dd>{vehicle.inventoryType.replaceAll("_", " ")}</dd></div>
            <div><dt>Visibility</dt><dd>{vehicle.published ? "Published" : "Unpublished"}</dd></div>
          </dl>
          <VehicleActions vehicle={vehicle} role={role} />
        </article>
      ))}
    </div>
  );
}

function VehicleInventory({ staffUser, listing, notice }) {
  const previousHref = getPageHref({
    ...listing,
    page: listing.page - 1,
  });
  const nextHref = getPageHref({
    ...listing,
    page: listing.page + 1,
  });
  const hasPreviousPage = listing.page > 1;
  const hasNextPage = listing.page < listing.totalPages;

  return (
    <div className="admin-dashboard">
      <AdminNavigation activeSection="Cars" />

      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <p className="admin-eyebrow">ADMINISTRATION</p>
            <h1>Car Inventory</h1>
          </div>
        </div>

        <div className="admin-staff-bar">
          <span>
            Signed in as {staffUser.displayName || staffUser.email} ({staffUser.role})
          </span>
          <StaffSignOut />
        </div>

        <section className="admin-panel" aria-labelledby="inventory-heading">
          <div className="admin-panel-header">
            <div>
              <h2 id="inventory-heading">All car listings</h2>
              <p>Search and review every inventory record.</p>
            </div>
            <Link href="/admin/vehicles/new"
                  className="admin-vehicle-create-link">
              + Create New Car Listing
            </Link>
          </div>
          {notice && (
            <p className="admin-success-message" role="status">
              {notice === "published" ? "Car published successfully." : "Stock status updated successfully."}
            </p>
          )}

          <form className="admin-vehicle-filters" action="/admin/vehicles" method="get">
            <label>
              <span>Search inventory</span>
              <input
                type="search"
                name="q"
                defaultValue={listing.search}
                maxLength={100}
                placeholder="Stock code, make, or model"
              />
            </label>
            <label>
              <span>Status</span>
              <select name="status" defaultValue={listing.status ?? ""}>
                <option value="">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <button type="submit">Apply filters</button>
          </form>

          <p className="admin-vehicle-count" aria-live="polite">
            {listing.total} {listing.total === 1 ? "car" : "cars"} found
          </p>

          {listing.vehicles.length === 0 ? (
            <div className="admin-empty-state">
              <span aria-hidden="true">🚘</span>
              <h3>No cars found</h3>
              <p>
                {listing.search || listing.status
                  ? "Try changing the search or status filter."
                  : "Car inventory will appear here once records are available."}
              </p>
            </div>
          ) : (
            <>
              <div className="admin-vehicle-table-wrap">
                <table className="admin-vehicle-table">
                  <thead>
                    <tr>
                      <th scope="col">Stock code</th>
                      <th scope="col">Car</th>
                      <th scope="col">Price</th>
                      <th scope="col">Status</th>
                      <th scope="col">Inventory type</th>
                      <th scope="col">Visibility</th>
                      <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody><VehicleRows vehicles={listing.vehicles} role={staffUser.role} /></tbody>
                </table>
              </div>
              <VehicleCards vehicles={listing.vehicles} role={staffUser.role} />
            </>
          )}

          {listing.totalPages > 1 && (
            <nav className="admin-pagination" aria-label="Car inventory pages">
              {hasPreviousPage ? (
                <Link href={previousHref}>← Previous</Link>
              ) : <span>← Previous</span>}
              <span>Page {listing.page} of {listing.totalPages}</span>
              {hasNextPage ? (
                <Link href={nextHref}>Next →</Link>
              ) : <span>Next →</span>}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}

function AdminVehiclesLoading() {
  return (
    <section className="admin-login" aria-live="polite">
      <div className="admin-login-card">
        <p className="admin-eyebrow">ADMINISTRATION</p>
        <h1>Loading car inventory…</h1>
      </div>
    </section>
  );
}

async function AdminVehiclesContent({ searchParams }) {
  const params = await searchParams;
  let result;

  try {
    result = await getAuthorizedAdminVehicleListing(params);
  } catch (error) {
    if (error instanceof StaffAuthorizationError) {
      redirect("/admin");
    }

    throw error;
  }

  return (
    <VehicleInventory
      staffUser={result.staffUser}
      listing={result.listing}
      notice={typeof params.notice === "string" ? params.notice : ""}
    />
  );
}

export default function AdminVehiclesPage({ searchParams }) {
  return (
    <Suspense fallback={<AdminVehiclesLoading />}>
      <AdminVehiclesContent searchParams={searchParams} />
    </Suspense>
  );
}
