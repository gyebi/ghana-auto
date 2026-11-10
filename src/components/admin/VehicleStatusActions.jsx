"use client";

import { useActionState } from "react";

import { vehicleStatusAction } from "@/app/admin/vehicles/actions";

const confirmationCopy = {
  publish: "Publish this car to the public Ghana Auto catalogue?",
  sold: "Mark this car as sold? This will remove it from the public catalogue.",
  archive: "Archive this car? Archived cars are retained as read-only records.",
};

export default function VehicleStatusAction({ vehicleId, action, label }) {
  const [state, formAction, pending] = useActionState(
    vehicleStatusAction.bind(null, vehicleId, action),
    { formError: "" }
  );

  function confirmAction(event) {
    if (confirmationCopy[action] && !window.confirm(confirmationCopy[action])) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} className="admin-vehicle-status-action" onSubmit={confirmAction}>
      <button disabled={pending} type="submit">{pending ? "Saving…" : label}</button>
      {state.formError && <p role="alert">{state.formError}</p>}
    </form>
  );
}
