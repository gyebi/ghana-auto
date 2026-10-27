
import Link from "next/link";

import styles from "./not-found.module.css";

export default function VehicleNotFound() {
  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <p className={styles.errorCode}>404</p>

        <h1 className={styles.title}>
          Vehicle Not Found
        </h1>

        <p className={styles.description}>
          The vehicle you are looking for may have been
          removed, sold, or is no longer available.
          Explore our current inventory to find
          another great option.
        </p>

        <Link href="/cars" className={styles.button}>
          ← Browse Available Vehicles
        </Link>
      </div>
    </section>
  );
}

