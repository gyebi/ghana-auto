import { StaffAuthorizationError } from "../../../../../lib/auth/staff-session.js";
import { revalidatePath } from "next/cache.js";
import {
  hasJsonContentType,
  isSameOriginRequest,
  readSmallJsonBody,
} from "../../../../../lib/auth/request-validation.mjs";
import {
  DraftImageUploadError,
  manageDraftVehicleImage,
} from "../../../../../lib/admin/vehicle-image-upload-service.js";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  Vary: "Cookie, Origin",
};

function json(body, status) {
  return Response.json(body, { status, headers: PRIVATE_NO_STORE_HEADERS });
}

function revalidateVehiclePhotos() {
  revalidatePath("/");
  revalidatePath("/cars");
  revalidatePath("/contact");
  revalidatePath("/cars/[slug]", "page");
}

function getManagementRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const allowedKeys = new Set(["action", "imageId", "direction"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) return null;
  if (typeof body.action !== "string" || typeof body.imageId !== "string") return null;

  if (body.action === "cover" || body.action === "remove") {
    return Object.keys(body).length === 2
      ? { action: body.action, imageId: body.imageId }
      : null;
  }
  if (
    body.action === "reorder" &&
    Object.keys(body).length === 3 &&
    typeof body.direction === "string"
  ) {
    return { action: body.action, imageId: body.imageId, direction: body.direction };
  }

  return null;
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return json({ error: "Request origin was not accepted." }, 403);
  }
  if (!hasJsonContentType(request)) {
    return json({ error: "Expected a JSON request." }, 415);
  }

  const body = await readSmallJsonBody(request);
  const input = body.ok ? getManagementRequest(body.value) : null;
  if (!input) return json({ error: "Invalid photo-management request." }, 400);

  try {
    const result = await manageDraftVehicleImage(input);
    if (result.ok) {
      revalidateVehiclePhotos();
      return json({ ok: true, images: result.images }, 200);
    }
    if (result.reason === "not_found_or_not_editable") {
      return json({ error: "Photo was not found on a car you can manage." }, 404);
    }
    if (result.reason === "final_published_photo") {
      return json({ error: "A published car must retain at least one photo. Unpublish it before removing the final photo." }, 409);
    }
    return json({ error: "Unable to update this photo." }, 409);
  } catch (error) {
    if (error instanceof StaffAuthorizationError) {
      return json({ error: "Staff authorization is required." }, 403);
    }
    if (error instanceof DraftImageUploadError) {
      if (error.code === "not_found_or_not_editable") {
        return json({ error: "Photo was not found on a car you can manage." }, 404);
      }
      if (error.code === "cloudinary_cleanup_failed") {
        return json(
          {
            error:
              "The photo was removed from this car, but Cloudinary cleanup failed. It requires safe server-side cleanup.",
            detached: true,
            images: error.images,
          },
          502
        );
      }
      return json({ error: "This photo could not be verified or updated." }, 400);
    }
    // ADD DIAGNOSTIC LOGGING HERE
    if (process.env.NODE_ENV === "development") {
      console.error("[CAR PHOTO MANAGEMENT]", {
        name: error?.name ?? "UnknownError",
        code: error?.code ?? "unknown",
        message:
          typeof error?.message === "string"
            ? error.message.slice(0, 400)
            : "No error message",
      });
    }
    return json({ error: "Unable to update this photo." }, 503);
  }
}
