"use client";

export default function AdminVehiclesError({ retry }) {
  return (
    <section className="admin-login" role="alert">
      <div className="admin-login-card">
        <p className="admin-eyebrow">ADMINISTRATION</p>
        <h1>Car inventory is temporarily unavailable</h1>
        <p>Try again shortly. If the problem continues, contact an administrator.</p>
        <button type="button" onClick={retry}>Try again</button>
      </div>
    </section>
  );
}
