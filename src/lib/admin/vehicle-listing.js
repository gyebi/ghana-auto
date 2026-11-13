import "server-only";

import { requireActiveStaffSession } from "../auth/staff-session.js";
import {
  getAdminVehicleStatistics,
  listAdminVehicles,
} from "../db/admin-vehicle-repository.js";

export async function getAuthorizedAdminVehicleListing(searchParams) {
  const staffUser = await requireActiveStaffSession();
  const listing = await listAdminVehicles(searchParams);

  return { staffUser, listing };
}

export async function getAuthorizedAdminVehicleDashboard() {
  const staffUser = await requireActiveStaffSession();
  const statistics = await getAdminVehicleStatistics();

  return { staffUser, statistics };
}
