
"use client";

import { useState } from "react";
import Image from "next/image";
import "./VehicleGallery.css";

export default function VehicleGallery({ images = [], title }) {
  const validImages = images.filter(
    (image) => typeof image === "string" && image.length > 0
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const imageCount = validImages.length;

  const activeIndex = Math.min(
    selectedIndex,
    Math.max(validImages.length - 1, 0)
  );

 function showPrevious() {
    if (imageCount < 2) return;

    setSelectedIndex(
      (current) => (current - 1 + imageCount) % imageCount
    );
  }

  function showNext() {

    if (imageCount < 2) return;

    setSelectedIndex(
      (current) => (current + 1) % imageCount
    );
  }

  if (validImages.length === 0) {
    return (
      <div className="gallery-placeholder" role="img"
        aria-label={`No photograph available for ${title}`}>
        <span aria-hidden="true">🚘</span>
        <p>Vehicle photographs coming soon</p>
      </div>
    );
  }

  return (
    <div className="vehicle-gallery">
      <div className="gallery-main">
        <Image
          src={validImages[activeIndex]}
          alt={`${title} — photograph ${activeIndex + 1}`}
          fill
          sizes="(max-width: 900px) 100vw, 65vw"
          className="gallery-main-image"
          priority={activeIndex === 0}
        />

        {imageCount > 1 && (
          <>
            <button
              type="button"
              className="gallery-arrow gallery-arrow-prev"
              onClick={showPrevious}
              aria-label="Previous vehicle photograph"
            >
              <span aria-hidden="true">‹</span>
            </button>

            <button
              type="button"
              className="gallery-arrow gallery-arrow-next"
              onClick={showNext}
              aria-label="Next vehicle photograph"
            >
              <span aria-hidden="true">›</span>
            </button>

            <div className="gallery-counter" aria-live="polite">
              {activeIndex + 1} / {imageCount}
            </div>
          </>
        )}
      </div>

      {imageCount > 1 && (
        <div className="gallery-thumbnails">
          {validImages.map((image, index) => (
            <button
              type="button"
              key={`${image}-${index}`}
              className={`gallery-thumbnail ${activeIndex === index ? "active" : ""
                }`}
              onClick={() => setSelectedIndex(index)}
              aria-label={`View photograph ${index + 1}`}
              aria-pressed={activeIndex === index}
            >
              <Image
                src={image}
                alt=""
                fill
                sizes="100px"
                className="gallery-thumb-image"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
