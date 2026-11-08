"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdminVehicle,
  updateAdminVehicle,
} from "@/lib/admin/vehicle-mutation-service";
import { getCreatedVehicleConfirmationPath } from "@/lib/admin/vehicle-creation-routing";

function toActionState(result) {
  return {
    errors: result.errors ?? {},
    formError: result.errors?.form ?? "",
    values: result.values ?? null,
  };
}

export async function createVehicleAction(_previousState, formData) {
  const result = await createAdminVehicle(formData);

  if (!result.ok) return toActionState(result);

  revalidatePath("/admin/vehicles");
  redirect(getCreatedVehicleConfirmationPath(result.vehicle.id));
}

export async function updateVehicleAction(id, _previousState, formData) {
  const result = await updateAdminVehicle(id, formData);

  if (!result.ok) return toActionState(result);

  revalidatePath("/admin/vehicles");
  redirect(`/admin/vehicles/${result.vehicle.id}/edit`);
}
