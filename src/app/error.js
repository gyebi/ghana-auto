"use client";

import "./error.css";

export default function GlobalError({ reset }) {
  return (
    <main className="site-error" role="alert">
      <div>
        <h1>We couldn&apos;t load that page</h1>
        <p>
          Please try again. If the problem continues, return to the
          vehicle collection and try again later.
        </p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
