import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_CAR_PHOTO_BYTES,
  validateCarPhotoFiles,
} from "../src/lib/admin/vehicle-photo-client-policy.mjs";

test("browser-side photo policy rejects unsupported and oversized files before upload", () => {
  assert.match(
    validateCarPhotoFiles([{ name: "document.pdf", type: "application/pdf", size: 100 }], 3),
    /not a JPEG, PNG, or WebP/
  );
  assert.match(
    validateCarPhotoFiles([{ name: "large.jpg", type: "image/jpeg", size: MAX_CAR_PHOTO_BYTES + 1 }], 3),
    /10 MB limit/
  );
  assert.equal(
    validateCarPhotoFiles([{ name: "photo.webp", type: "image/webp", size: MAX_CAR_PHOTO_BYTES }], 1),
    null
  );
  assert.match(validateCarPhotoFiles([{ name: "photo.png", type: "image/png", size: 1 }], 0), /maximum/);
});
