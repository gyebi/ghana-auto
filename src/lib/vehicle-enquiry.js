import { getVehicleTitle } from "./vehicle-format.js";

// Keep enquiry summaries limited to fields already approved for the public UI.
export function getVehicleEnquiryContext(vehicle) {
  if (!vehicle) return null;

  return {
    stockCode: vehicle.id,
    slug: vehicle.slug,
    title: getVehicleTitle(vehicle),
    price: vehicle.price,
    showPrice: vehicle.showPrice === true,
    type:
      vehicle.inventoryType === "IMPORT_ORDER"
        ? "IMPORT_REQUEST"
        : "VEHICLE_ENQUIRY",
  };
}
