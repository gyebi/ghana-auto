
import Link from "next/link";
import Image from "next/image";
import "./about.css";

export const metadata = {
  title: "About Us | Ghana Auto",
};

export default function AboutPage() {
  return (
    <article className="about-page">
      <header className="about-hero">
        <div className="about-container about-hero-layout">
          <div className="about-hero-copy">
            <p className="about-eyebrow">ABOUT GHANA AUTO</p>
            <h1>Where You Find Your Next Car!</h1>
            <p>
              At Ghana Auto, we believe finding the right car should begin with
              practical choices, affordable pricing, and reliable information to
              help you make an informed decision.
            </p>
          </div>

          <div className="about-photo about-hero-photo">
            <Image
              src="/images/vehicles/honda-accord-2018.jpg"
              alt="2018 Honda Accord sedan photographed from the front side"
              fill
              priority
              sizes="(max-width: 900px) calc(100vw - 48px), 42vw"
            />
          </div>
        </div>
      </header>

      <div className="about-container about-content">
        <section aria-labelledby="about-introduction-title">
          <h2 id="about-introduction-title" className="visually-hidden">
            About Ghana Auto
          </h2>
          <p>
            We help customers explore available cars, compare features, review
            photographs and specifications, and enquire about vehicles that
            match their needs, preferences, and budgets.
          </p>
          <p>
            Whether you&apos;re looking for a family SUV, a dependable everyday
            sedan, or a specific car that isn&apos;t currently listed, Ghana Auto
            is here to help you explore your options and take the next step
            toward owning your ideal vehicle.
          </p>
        </section>

        <div className="about-gallery" aria-label="Ghana Auto vehicle gallery">
          <div className="about-photo about-gallery-photo">
            <Image
              src="/images/vehicles/kia-sportage-2021.jpg"
              alt="2021 Kia Sportage SUV exterior"
              fill
              sizes="(max-width: 640px) calc(100vw - 36px), (max-width: 900px) calc(50vw - 36px), 31vw"
            />
          </div>
          <div className="about-photo about-gallery-photo">
            <Image
              src="/images/vehicles/toyota-corolla-2017.jpg"
              alt="2017 Toyota Corolla sedan exterior"
              fill
              sizes="(max-width: 640px) calc(100vw - 36px), (max-width: 900px) calc(50vw - 36px), 31vw"
            />
          </div>
          <div className="about-photo about-gallery-photo">
            <Image
              src="/images/vehicles/hyundai-tucson-2020.jpg"
              alt="2020 Hyundai Tucson SUV exterior"
              fill
              sizes="(max-width: 640px) calc(100vw - 36px), (max-width: 900px) calc(50vw - 36px), 31vw"
            />
          </div>
        </div>

        <section className="about-section" aria-labelledby="what-we-do-title">
          <p className="about-eyebrow">OUR SERVICES</p>
          <h2 id="what-we-do-title">What We Do</h2>

          <div className="about-service-grid">
            <section className="about-service-card">
              <h3>Car Sales</h3>
              <p>
                Explore our collection of available cars, view detailed
                photographs, compare specifications, and discover vehicles that
                suit your lifestyle and budget.
              </p>
              <p>
                Our listings provide useful information about each car, with
                opportunities to contact us directly for further details on
                pricing, condition, and availability.
              </p>
            </section>

            <section className="about-service-card">
              <h3>Vehicle Sourcing</h3>
              <p className="about-service-question">
                Can&apos;t find the car you&apos;re looking for?
              </p>
              <p>
                Let us know your preferred make, model, year, and budget. Ghana
                Auto can help you explore vehicle-sourcing opportunities,
                including cars available for purchase or import upon request.
              </p>
              <p>
                We work with customers to discuss available options, estimated
                costs, and delivery arrangements before proceeding with any
                purchase.
              </p>
            </section>

            <section className="about-service-card">
              <h3>Direct Customer Enquiries</h3>
              <p>
                We believe communication should be simple and convenient.
              </p>
              <p>
                Whether you&apos;re interested in a particular car or need
                assistance finding one, you can contact Ghana Auto directly
                through WhatsApp, SMS, or email.
              </p>
              <p>
                Our goal is to make it easy to ask questions, request
                additional information, and discuss your vehicle requirements.
              </p>
            </section>
          </div>
        </section>

        <section className="about-section about-approach" aria-labelledby="approach-title">
          <p className="about-eyebrow">OUR APPROACH</p>
          <h2 id="approach-title">Making Car Buying Convenient and Transparent</h2>
          <p>
            At Ghana Auto, our approach focuses on making the car-buying
            process straightforward, accessible, and transparent.
          </p>
          <p>
            Our online inventory provides clear photographs, vehicle
            specifications, availability information, and pricing where
            applicable, helping customers explore their options before making
            contact.
          </p>
          <p>
            We clearly distinguish between cars available locally, cars in
            transit, and vehicles available to order.
          </p>
          <p>
            For vehicles sourced or imported upon request, we can discuss
            shipping arrangements, estimated delivery timelines, and associated
            costs based on the customer&apos;s requirements.
          </p>
          <p>
            We encourage every customer to confirm vehicle condition,
            availability, final pricing, shipping and clearing costs, and
            delivery timelines before making a purchasing commitment.
          </p>
          <p>Our aim is to help you make informed decisions with confidence.</p>
        </section>

        <section className="about-next-car" aria-labelledby="next-car-title">
          <div className="about-next-car-content">
            <p className="about-eyebrow">LET&apos;S GET STARTED</p>
            <h2 id="next-car-title">Let&apos;s Find Your Next Car</h2>
            <p>
              Your next car could be just a few clicks away. Browse our current
              collection or tell us exactly what you&apos;re looking for. Whether
              you have a particular vehicle in mind or are still exploring your
              options, Ghana Auto is ready to discuss your requirements.
            </p>
            <div className="about-actions">
              <Link href="/cars">Explore Our Cars</Link>
              <Link href="/contact">Contact Us</Link>
            </div>
          </div>

          <div className="about-photo about-cta-photo">
            <Image
              src="/images/vehicles/toyota-rav4-2019.jpg"
              alt="2019 Toyota RAV4 SUV exterior"
              fill
              sizes="(max-width: 900px) calc(100vw - 88px), 30vw"
            />
          </div>
        </section>

        <p className="about-legal">
          Ghana Auto is operated by CRESVIA TECHNOLOGIES, a registered company
          in Ghana.
        </p>
      </div>
    </article>
  );
}
