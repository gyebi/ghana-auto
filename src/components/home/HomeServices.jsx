import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCarSide,
  faHeadset,
  faShip,
} from "@fortawesome/free-solid-svg-icons";
import "./HomeServices.css";

const services = [
  {
    title: "Browse Our Cars",
    description:
      "Explore our available vehicle inventory and find a car or SUV that suits your needs.",
    href: "/cars",
    icon: faCarSide,
    linkLabel: "Browse cars",
  },
  {
    title: "Vehicle Sourcing",
    description:
      "Enquire about vehicles available to order, and let us help you find the right option.",
    href: "/contact",
    icon: faShip,
    linkLabel: "Ask about sourcing a vehicle",
  },
  {
    title: "Direct Enquiries",
    description:
      "Contact our dealership to discuss your requirements and get helpful, personal guidance.",
    href: "/contact",
    icon: faHeadset,
    linkLabel: "Contact Ghana Auto",
  },
];

export default function HomeServices() {
  return (
    <section className="home-services" aria-labelledby="home-services-title">
      <div className="home-services-container">
        <div className="home-services-heading">
          <p className="home-services-eyebrow">HOW WE CAN HELP</p>
          <h2 id="home-services-title">Our Services</h2>
          <p>
            From browsing available cars to discussing your specific requirements,
            Ghana Auto is here to help.
          </p>
        </div>

        <div className="home-services-grid">
          {services.map(({ title, description, href, icon, linkLabel }) => (
            <article className="home-service-card" key={title}>
              <div className="home-service-icon" aria-hidden="true">
                <FontAwesomeIcon icon={icon} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <Link className="home-service-link" href={href}>
                {linkLabel}
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
