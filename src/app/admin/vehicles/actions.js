"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdminVehicle,
  publishAdminVehicle,
  transitionAdminVehicle,
  updateAdminVehicle,
  updatePublishedAdminVehicle,
  updateReservedAdminVehicle,
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

function revalidateVehiclePages(slug) {
  revalidatePath("/");
  revalidatePath("/cars");
  revalidatePath("/contact");
  revalidatePath("/cars/[slug]", "page");
  if (slug) revalidatePath(`/cars/${slug}`);
  revalidatePath("/admin/vehicles");
}

export async function updatePublishedVehicleAction(id, _previousState, formData) {
  const result = await updatePublishedAdminVehicle(id, formData);
  if (!result.ok) return toActionState(result);

  revalidateVehiclePages();
  redirect(`/admin/vehicles/${result.vehicle.id}/edit?notice=live-saved`);
}

export async function updateReservedVehicleAction(id, _previousState, formData) {
  const result = await updateReservedAdminVehicle(id, formData);
  if (!result.ok) return toActionState(result);

  revalidateVehiclePages();
  redirect(`/admin/vehicles/${result.vehicle.id}/edit?notice=reserved-saved`);
}

// Form actions are intentionally tiny adapters. Authorization, origin checks,
// input allowlists, and transition rules live in the service/repository layers.
export async function vehicleStatusAction(id, action, _previousState, formData) {
  const result = action === "publish"
    ? await publishAdminVehicle(id)
    : await transitionAdminVehicle(id, action);
  if (!result.ok) return { formError: result.message ?? "Unable to update this car." };

  revalidateVehiclePages();
  const notice = action === "publish" ? "published" : `${action}d`;
  redirect(`/admin/vehicles?notice=${encodeURIComponent(notice)}`);
}
