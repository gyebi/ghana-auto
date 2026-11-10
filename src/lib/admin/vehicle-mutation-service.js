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
  findAdminVehicleForPublishedEdit,
  findAdminVehicleForReadOnlyView,
  findAdminVehicleForReservedManagement,
  publishDraftVehicle,
  transitionVehicleStatus,
  updateDraftVehicle,
  updatePublishedVehicle,
  updateReservedVehicle,
  VehicleMutationConflictError,
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

function toConflictResult(values) {
  return {
    ok: false,
    errors: { form: "This car was changed by another request. Please review it and try again." },
    values,
  };
}

async function requireAuthorizedVehicleMutation() {
  const staffUser = await requireActiveStaffSession();
  await requireAllowedStaffMutationOrigin();

  return staffUser;
}

async function requireAuthorizedAdminVehicleMutation() {
  const staffUser = await requireAuthorizedVehicleMutation();
  if (staffUser.role !== "ADMIN") {
    const error = new Error("Administrator authorization is required.");
    error.code = "ADMIN_REQUIRED";
    throw error;
  }
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

    if (error instanceof VehicleMutationConflictError) return toConflictResult(values);

    throw error;
  }
}

async function updateVehicleForState(id, formData, operation, unavailableMessage) {
  await requireAuthorizedAdminVehicleMutation();
  const values = getSubmittedVehicleFormValues(formData);

  if (!isValidAdminVehicleId(id)) {
    return { ok: false, errors: { form: "Car record was not found." }, values };
  }

  const validated = validateVehicleFormData(formData);
  if (!validated.ok) return { ...validated, values };

  try {
    const vehicle = await operation(id, validated.data);
    if (vehicle?.reason === "ineligible") {
      return {
        ok: false,
        errors: { form: `This live car must retain ${vehicle.problems.join(", ")}.` },
        values,
      };
    }
    if (!vehicle?.id) {
      return { ok: false, errors: { form: unavailableMessage }, values };
    }
    return { ok: true, vehicle };
  } catch (error) {
    if (error instanceof VehicleMutationConflictError) return toConflictResult(values);
    throw error;
  }
}

export function updatePublishedAdminVehicle(id, formData) {
  return updateVehicleForState(
    id,
    formData,
    updatePublishedVehicle,
    "This live car can no longer be edited because its stock status changed."
  );
}

export function updateReservedAdminVehicle(id, formData) {
  return updateVehicleForState(
    id,
    formData,
    updateReservedVehicle,
    "This reserved car can no longer be managed because its stock status changed."
  );
}

export async function publishAdminVehicle(id) {
  await requireAuthorizedAdminVehicleMutation();
  if (!isValidAdminVehicleId(id)) return { ok: false, message: "Car record was not found." };

  let result;
  try {
    result = await publishDraftVehicle(id);
  } catch (error) {
    if (error instanceof VehicleMutationConflictError) {
      return { ok: false, message: "This car was changed by another request. Please review it and try again." };
    }
    throw error;
  }
  if (result.ok) return { ok: true };
  if (result.reason === "ineligible") {
    return {
      ok: false,
      message: `This draft cannot be published until it has ${result.problems.join(", ")}.`,
    };
  }
  return { ok: false, message: "This car is no longer an unpublished draft." };
}

export async function transitionAdminVehicle(id, action) {
  await requireAuthorizedAdminVehicleMutation();
  if (!isValidAdminVehicleId(id)) return { ok: false, message: "Car record was not found." };
  if (!["unpublish", "reserve", "sold", "archive"].includes(action)) {
    return { ok: false, message: "That stock-status action is not available." };
  }

  let result;
  try {
    result = await transitionVehicleStatus(id, action);
  } catch (error) {
    if (error instanceof VehicleMutationConflictError) {
      return { ok: false, message: "This car was changed by another request. Please review it and try again." };
    }
    throw error;
  }
  return result.ok
    ? { ok: true }
    : { ok: false, message: "That stock-status transition is no longer available for this car." };
}

export async function getAuthorizedVehicleForEdit(id) {
  const staffUser = await requireActiveStaffSession();

  if (!isValidAdminVehicleId(id)) return null;
  const draft = await findAdminVehicleForEdit(id);
  if (draft) return { vehicle: draft, mode: "draft" };
  if (staffUser.role !== "ADMIN") return null;

  const published = await findAdminVehicleForPublishedEdit(id);
  if (published) return { vehicle: published, mode: "published" };
  const reserved = await findAdminVehicleForReservedManagement(id);
  return reserved ? { vehicle: reserved, mode: "reserved" } : null;
}

export async function getAuthorizedVehicleForReadOnlyView(id) {
  await requireActiveStaffSession();
  if (!isValidAdminVehicleId(id)) return null;
  return findAdminVehicleForReadOnlyView(id);
}

export async function getAuthorizedVehicleCreationConfirmation(id) {
  await requireActiveStaffSession();

  if (!isValidAdminVehicleId(id)) return null;

  return findAdminVehicleForCreationConfirmation(id);
}
