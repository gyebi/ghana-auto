import "server-only";

import { requireActiveStaffSession } from "../auth/staff-session.js";
import { listAdminVehicles } from "../db/admin-vehicle-repository.js";

export async function getAuthorizedAdminVehicleListing(searchParams) {
  const staffUser = await requireActiveStaffSession();
  const listing = await listAdminVehicles(searchParams);

  return { staffUser, listing };
}
