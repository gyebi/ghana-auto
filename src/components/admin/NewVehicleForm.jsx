"use client";

import { useRouter } from "next/navigation";

import VehicleForm from "./VehicleForm";

export default function NewVehicleForm() {
  const { bfcacheId } = useRouter();

  // A new push navigation to /admin/vehicles/new must not revive the previous
  // draft from the Activity cache after a successful creation.
  return <VehicleForm key={bfcacheId} />;
}
