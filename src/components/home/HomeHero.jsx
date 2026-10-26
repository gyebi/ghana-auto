
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./HomeHero.css";


const heroImages = [
  "/images/branding/unsplash1.jpg",
  "/images/branding/unsplash2.jpg",
  "/images/branding/unsplash3.jpg",
  "/images/branding/unsplash4.jpg",
  "/images/branding/unsplash5.jpg",
];

export default function HomeHero() {

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((previous) =>
        previous === heroImages.length - 1 ? 0 : previous + 1
      );
    }, 7000); // change every 7 seconds

    return () => clearInterval(interval);
  }, []);



  return (
    <section className="home-hero" aria-labelledby="hero-title">
      <div className="hero-backgrounds" aria-hidden="true">
        {heroImages.map((image, index) => (
          <div
            key={image}
            className={`hero-background-slide ${index === currentImageIndex ? "is-active" : ""
              }`}
            style={{ backgroundImage: `url(${image})` }}
          />
        ))}
        <div className="hero-overlay" />
      </div>

      <div className="hero-container">
        <div className="hero-content">
          <p className="hero-eyebrow">FIND YOUR NEXT DRIVE</p>

          <h1 id="hero-title">
            Drive With
            <span> Confidence.</span>
          </h1>

          <p className="hero-description">
            Discover your next vehicle from our collection
            of cars and SUVs. Browse the details, explore
            your options, and contact us directly.
          </p>

          <div className="hero-actions">
            <Link href="/cars" className="hero-btn hero-btn-primary">
              Explore Vehicles
            </Link>

            <Link
              href="/about"
              className="hero-btn hero-btn-secondary"
            >
              Discover More
            </Link>
          </div>
        </div>


      </div>

      <div className="hero-bottom">
        <span>EXPLORE OUR COLLECTION</span>
        <span className="hero-scroll-line" aria-hidden="true" />
      </div>
    </section>
  );
}
