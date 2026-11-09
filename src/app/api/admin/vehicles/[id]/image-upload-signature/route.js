import { StaffAuthorizationError } from "../../../../../../lib/auth/staff-session.js";
import {
  hasJsonContentType,
  isSameOriginRequest,
  readSmallJsonBody,
} from "../../../../../../lib/auth/request-validation.mjs";
import {
  DraftImageUploadError,
  issueDraftVehicleImageUploadSignature,
} from "../../../../../../lib/admin/vehicle-image-upload-service.js";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  Vary: "Cookie, Origin",
};

function json(body, status) {
  return Response.json(body, { status, headers: PRIVATE_NO_STORE_HEADERS });
}

function isEmptyObject(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  );
}

// This endpoint intentionally accepts no client-controlled upload options.
// The server supplies and signs every Cloudinary parameter.
export async function POST(request, { params }) {
  if (!isSameOriginRequest(request)) {
    return json({ error: "Request origin was not accepted." }, 403);
  }

  if (!hasJsonContentType(request)) {
    return json({ error: "Expected a JSON request." }, 415);
  }

  const body = await readSmallJsonBody(request);
  if (!body.ok || !isEmptyObject(body.value)) {
    return json({ error: "Invalid upload-signature request." }, 400);
  }

  try {
    const { id } = await params;
    const upload = await issueDraftVehicleImageUploadSignature(id);
    return json({ upload }, 200);
  } catch (error) {
    if (error instanceof StaffAuthorizationError) {
      return json({ error: "Staff authorization is required." }, 403);
    }
    if (error instanceof DraftImageUploadError) {
      if (error.code === "not_found") return json({ error: "Car record was not found." }, 404);
      if (error.code === "image_limit_reached") {
        return json({ error: "This car already has the maximum of 10 photos." }, 409);
      }
    }

    // Configuration and database failures are deliberately not presented as
    // successful uploads or with internal details.
    return json({ error: "Unable to prepare an image upload." }, 503);
  }
}
