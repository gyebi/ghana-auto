export function getCreatedVehicleConfirmationPath(id) {
  return `/admin/vehicles/${id}/created`;
}

export function getCreatedVehicleConfirmationLinks(id) {
  return {
    addAnother: "/admin/vehicles/new",
    edit: `/admin/vehicles/${id}/edit`,
    inventory: "/admin/vehicles",
  };
}
