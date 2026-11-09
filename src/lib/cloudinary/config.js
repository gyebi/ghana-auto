
import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { v2 as cloudinary } from "cloudinary";

export function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary server configuration is incomplete.");
  }

  const environment = process.env.CLOUDINARY_MEDIA_ENV;

  if (!["dev", "prod"].includes(environment)) {
    throw new Error("Invalid Cloudinary media environment.");
  }
  
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return {
    cloudinary,
    apiKey,
    cloudName,
    environment,
    folder: `ghana-auto/${environment}/vehicles`,
    // Keep the secret inside this server-only module. Callers receive only the
    // resulting signature, never the credential used to create it.
    signUploadParams(params) {
      return cloudinary.utils.api_sign_request(params, apiSecret);
    },
    // This uses a domain-separated HMAC so the Cloudinary API secret remains
    // server-only while also making upload grants portable across App Hosting
    // instances configured with the same project credentials.
    signUploadGrant(serializedGrant) {
      return createHmac("sha256", apiSecret)
        .update(`ghana-auto:vehicle-upload-grant:v1:${serializedGrant}`)
        .digest("base64url");
    },
    verifyUploadGrantSignature(serializedGrant, suppliedSignature) {
      if (typeof suppliedSignature !== "string") return false;

      const expected = createHmac("sha256", apiSecret)
        .update(`ghana-auto:vehicle-upload-grant:v1:${serializedGrant}`)
        .digest();

      try {
        const supplied = Buffer.from(suppliedSignature, "base64url");
        return (
          supplied.length === expected.length &&
          timingSafeEqual(supplied, expected)
        );
      } catch {
        return false;
      }
    },
  };
}
