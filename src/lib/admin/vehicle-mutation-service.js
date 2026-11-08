import "server-only";

import { requireActiveStaffSession } from "../auth/staff-session.js";
import { requireAllowedStaffMutationOrigin } from "../auth/staff-mutation-origin.js";
import {
  getSubmittedVehicleFormValues,
  isValidAdminVehicleId,
  validateVehicleFormData,
} from "./vehicle-input.js";
import {
  createDraftVehicle,
  findAdminVehicleForCreationConfirmation,
  findAdminVehicleForEdit,
  updateDraftVehicle,
} from "../db/admin-vehicle-mutation-repository.js";

function getUniqueField(error) {
  if (error?.code !== "P2002") return null;

  const target = Array.isArray(error.meta?.target)
    ? error.meta.target
    : [error.meta?.target];

  if (target.includes("stockCode")) return "stockCode";
  if (target.includes("slug")) return "stockCode";

  return null;
}

function toDuplicateResult(values) {
  return {
    ok: false,
    errors: {
      form: "A car with these details already exists. Please try again.",
    },
    values,
  };
}

async function requireAuthorizedVehicleMutation() {
  const staffUser = await requireActiveStaffSession();
  await requireAllowedStaffMutationOrigin();

  return staffUser;
}

export async function createAdminVehicle(formData) {
  await requireAuthorizedVehicleMutation();

  const values = getSubmittedVehicleFormValues(formData);
  const validated = validateVehicleFormData(formData);

  if (!validated.ok) return { ...validated, values };

  try {
    const vehicle = await createDraftVehicle(validated.data);

    return { ok: true, vehicle };
  } catch (error) {
    const field = getUniqueField(error);

    if (field) return toDuplicateResult(values);

    throw error;
  }
}

export async function updateAdminVehicle(id, formData) {
  await requireAuthorizedVehicleMutation();

  const values = getSubmittedVehicleFormValues(formData);

  if (!isValidAdminVehicleId(id)) {
    return {
      ok: false,
      errors: { form: "Car record was not found." },
      values,
    };
  }

  const validated = validateVehicleFormData(formData);

  if (!validated.ok) return { ...validated, values };

  try {
    // Slugs are stable identifiers and intentionally do not change on edit.
    const vehicle = await updateDraftVehicle(id, validated.data);

    if (!vehicle) {
      return {
        ok: false,
        errors: {
          form: "This car can no longer be edited because it is no longer an unpublished draft.",
        },
        values,
      };
    }

    return { ok: true, vehicle };
  } catch (error) {
    const field = getUniqueField(error);

    if (field) return toDuplicateResult(values);

    if (error?.code === "P2025") {
      return {
        ok: false,
        errors: { form: "Car record was not found." },
        values,
      };
    }

    throw error;
  }
}

export async function getAuthorizedVehicleForEdit(id) {
  await requireActiveStaffSession();

  if (!isValidAdminVehicleId(id)) return null;

  return findAdminVehicleForEdit(id);
}

export async function getAuthorizedVehicleCreationConfirmation(id) {
  await requireActiveStaffSession();

  if (!isValidAdminVehicleId(id)) return null;

  return findAdminVehicleForCreationConfirmation(id);
}
