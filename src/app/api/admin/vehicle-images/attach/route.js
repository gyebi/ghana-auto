import { StaffAuthorizationError } from "../../../../../lib/auth/staff-session.js";
import { revalidatePath } from "next/cache.js";
import {
  hasJsonContentType,
  isSameOriginRequest,
  readSmallJsonBody,
} from "../../../../../lib/auth/request-validation.mjs";
import {
  attachIssuedDraftVehicleImage,
  DraftImageUploadError,
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

function getUploadGrant(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    typeof body.uploadGrant !== "string" ||
    body.uploadGrant.length === 0 ||
    body.uploadGrant.length > 2_048
  ) {
    return null;
  }

  return body.uploadGrant;
}

// The grant is the only accepted client value. Car IDs, Cloudinary URLs,
// folders, and public IDs are recovered and checked exclusively server-side.
export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return json({ error: "Request origin was not accepted." }, 403);
  }
  if (!hasJsonContentType(request)) {
    return json({ error: "Expected a JSON request." }, 415);
  }

  const body = await readSmallJsonBody(request);
  const uploadGrant = body.ok ? getUploadGrant(body.value) : null;
  if (!uploadGrant) return json({ error: "Invalid upload attachment request." }, 400);

  try {
    const result = await attachIssuedDraftVehicleImage(uploadGrant);

    if (result.ok) {
      revalidateVehiclePhotos();
      return json({ ok: true, image: result.image }, 200);
    }
    if (result.reason === "already_attached") {
      return json({ ok: true, alreadyAttached: true }, 200);
    }
    if (result.reason === "image_limit_reached") {
      return json({ error: "This car already has the maximum of 10 photos." }, 409);
    }
    if (result.reason === "not_editable") {
      return json({ error: "This car is no longer an unpublished draft." }, 409);
    }
    return json({ error: "Unable to attach this photo." }, 503);
  } catch (error) {
    if (error instanceof StaffAuthorizationError) {
      return json({ error: "Staff authorization is required." }, 403);
    }
    if (error instanceof DraftImageUploadError) {
      return json({ error: "The uploaded photo could not be verified or attached." }, 400);
    }
    return json({ error: "Unable to attach this photo." }, 503);
  }
}
