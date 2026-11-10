import test, { mock } from "node:test";
import assert from "node:assert/strict";

mock.module("server-only", {});

const { getCloudinaryConfig } = await import("../src/lib/cloudinary/config.js");

const configKeys = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLOUDINARY_MEDIA_ENV",
];

async function withCloudinaryEnvironment(values, callback) {
  const previous = Object.fromEntries(configKeys.map((key) => [key, process.env[key]]));

  try {
    for (const key of configKeys) {
      if (values[key] === undefined) delete process.env[key];
      else process.env[key] = values[key];
    }
    await callback();
  } finally {
    for (const key of configKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("Cloudinary configuration rejects missing credentials and invalid environments", async () => {
  await withCloudinaryEnvironment(
    {
      CLOUDINARY_CLOUD_NAME: "ghana-auto-dev",
      CLOUDINARY_API_KEY: "key",
      CLOUDINARY_API_SECRET: undefined,
      CLOUDINARY_MEDIA_ENV: "dev",
    },
    async () => {
      assert.throws(getCloudinaryConfig, /configuration is incomplete/);
    }
  );

  await withCloudinaryEnvironment(
    {
      CLOUDINARY_CLOUD_NAME: "ghana-auto-dev",
      CLOUDINARY_API_KEY: "key",
      CLOUDINARY_API_SECRET: "secret",
      CLOUDINARY_MEDIA_ENV: "staging",
    },
    async () => {
      assert.throws(getCloudinaryConfig, /Invalid Cloudinary media environment/);
    }
  );
});

test("Cloudinary configuration derives only approved dev and production folders", async () => {
  for (const environment of ["dev", "prod"]) {
    await withCloudinaryEnvironment(
      {
        CLOUDINARY_CLOUD_NAME: "ghana-auto-dev",
        CLOUDINARY_API_KEY: "key",
        CLOUDINARY_API_SECRET: "secret",
        CLOUDINARY_MEDIA_ENV: environment,
      },
      async () => {
        const config = getCloudinaryConfig();
        assert.equal(config.environment, environment);
        assert.equal(config.folder, `ghana-auto/${environment}/vehicles`);
        assert.equal(typeof config.signUploadParams, "function");
        const grantSignature = config.signUploadGrant("encoded-grant");
        assert.equal(
          config.verifyUploadGrantSignature("encoded-grant", grantSignature),
          true
        );
        assert.equal(
          config.verifyUploadGrantSignature("changed-grant", grantSignature),
          false
        );
        assert.equal("apiSecret" in config, false);
      }
    );
  }
});
