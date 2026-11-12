import test from "node:test";
import assert from "node:assert/strict";

import { getHomepagePhotoCardData } from "../src/lib/homepage-photo.js";

const vehicle = {
  slug: "2019-toyota-rav4",
  images: [
    "https://res.cloudinary.com/ghana-auto/image/upload/v1/cars/rav4.jpg",
    "https://res.cloudinary.com/ghana-auto/image/upload/v1/cars/rav4-side.jpg",
  ],
};

test("homepage photo cards use the selected cover image and public detail URL", () => {
  assert.deepEqual(getHomepagePhotoCardData(vehicle), {
    image: vehicle.images[0],
    href: "/cars/2019-toyota-rav4",
  });
});

test("homepage photo cards safely omit invalid cover images and detail URLs", () => {
  for (const invalidVehicle of [
    { ...vehicle, images: [] },
    { ...vehicle, images: [" https://res.cloudinary.com/example/car.jpg"] },
    { ...vehicle, images: ["https://example.com/car.jpg"] },
    { ...vehicle, images: ["javascript:alert(1)"] },
    { ...vehicle, slug: "not/a-public-slug" },
  ]) {
    assert.equal(getHomepagePhotoCardData(invalidVehicle), null);
  }
});
