"use client";

import { useActionState, useEffect } from "react";

import {
  createVehicleAction,
  updateVehicleAction,
} from "@/app/admin/vehicles/actions";
import {
  focusFirstInvalidVehicleFormField,
  vehicleFormFieldOrder,
} from "@/lib/admin/vehicle-form-state";

const initialState = { errors: {}, formError: "", values: null };

function getInitialValues(vehicle) {
  return {
    year: vehicle?.year ?? "",
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    bodyType: vehicle?.bodyType ?? "",
    condition: vehicle?.condition ?? "",
    transmission: vehicle?.transmission ?? "",
    fuelType: vehicle?.fuelType ?? "",
    mileage: vehicle?.mileage ?? "",
    location: vehicle?.location ?? "",
    price: vehicle?.price ?? "",
    currency: vehicle?.currency ?? "GHS",
    inventoryType: vehicle?.inventoryType ?? "LOCAL_STOCK",
    showPrice: vehicle?.showPrice ?? true,
    originCountry: vehicle?.originCountry ?? "",
    estimatedLeadTimeMinDays: vehicle?.estimatedLeadTimeMinDays ?? "",
    estimatedLeadTimeMaxDays: vehicle?.estimatedLeadTimeMaxDays ?? "",
    shippingCostEstimate: vehicle?.shippingCostEstimate ?? "",
    clearingCostEstimate: vehicle?.clearingCostEstimate ?? "",
    otherImportCostEstimate: vehicle?.otherImportCostEstimate ?? "",
    importCurrency: vehicle?.importCurrency ?? vehicle?.currency ?? "GHS",
    importNotes: vehicle?.importNotes ?? "",
    description: vehicle?.description ?? "",
  };
}

function FieldError({ errors, name }) {
  return errors[name] ? (
    <p className="admin-field-error" id={`${name}-error`}>
      {errors[name]}
    </p>
  ) : null;
}

function Field({ children, errors, label, name, required = false }) {
  return (
    <label className="admin-vehicle-field">
      <span>
        {label} {required && <b aria-hidden="true">*</b>}
      </span>
      {children}
      <FieldError errors={errors} name={name} />
    </label>
  );
}

function fieldAccessibility(errors, name) {
  return {
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    "aria-invalid": Boolean(errors[name]) || undefined,
    id: name,
  };
}

export default function VehicleForm({ vehicle }) {
  const action = vehicle
    ? updateVehicleAction.bind(null, vehicle.id)
    : createVehicleAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = state.values ?? getInitialValues(vehicle);
  const errors = state.errors;
  const errorFields = vehicleFormFieldOrder.filter((name) => errors[name]);

  useEffect(() => {
    focusFirstInvalidVehicleFormField(errors, document.getElementById);
  }, [errors]);

  function scrollToBrowserInvalid(event) {
    const field = event.target;
    requestAnimationFrame(() => field.scrollIntoView({ block: "center" }));
  }

  return (
    <form
      action={formAction}
      className="admin-vehicle-form"
      onInvalid={scrollToBrowserInvalid}
    >
      {(state.formError || errorFields.length > 0) && (
        <section
          aria-labelledby="vehicle-form-errors-title"
          className="admin-form-error admin-error-summary"
          role="alert"
        >
          <h2 id="vehicle-form-errors-title">Please correct the highlighted fields</h2>
          {state.formError && <p>{state.formError}</p>}
          {errorFields.length > 0 && (
            <ul>
              {errorFields.map((name) => (
                <li key={name}>
                  <a href={`#${name}`}>{errors[name]}</a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <fieldset>
        <legend>Car details</legend>
        <div className="admin-vehicle-form-grid">
          {vehicle ? (
            <Field errors={errors} label="Stock code" name="stockCode">
              <input id="stockCode" readOnly value={vehicle.stockCode} />
            </Field>
          ) : (
            <p className="admin-field-help">
              A stock code is assigned automatically when the draft is saved.
            </p>
          )}
          <Field errors={errors} label="Year" name="year" required>
            <input {...fieldAccessibility(errors, "year")} defaultValue={values.year} inputMode="numeric" maxLength={4} name="year" required />
          </Field>
          <Field errors={errors} label="Make" name="make" required>
            <input {...fieldAccessibility(errors, "make")} defaultValue={values.make} maxLength={80} name="make" required />
          </Field>
          <Field errors={errors} label="Model" name="model" required>
            <input {...fieldAccessibility(errors, "model")} defaultValue={values.model} maxLength={80} name="model" required />
          </Field>
          <Field errors={errors} label="Body type" name="bodyType" required>
            <input {...fieldAccessibility(errors, "bodyType")} defaultValue={values.bodyType} maxLength={60} name="bodyType" required />
          </Field>
          <Field errors={errors} label="Condition" name="condition" required>
            <input {...fieldAccessibility(errors, "condition")} defaultValue={values.condition} maxLength={60} name="condition" required />
          </Field>
          <Field errors={errors} label="Transmission" name="transmission" required>
            <input {...fieldAccessibility(errors, "transmission")} defaultValue={values.transmission} maxLength={60} name="transmission" required />
          </Field>
          <Field errors={errors} label="Fuel type" name="fuelType" required>
            <input {...fieldAccessibility(errors, "fuelType")} defaultValue={values.fuelType} maxLength={60} name="fuelType" required />
          </Field>
          <Field errors={errors} label="Mileage (km)" name="mileage">
            <input {...fieldAccessibility(errors, "mileage")} defaultValue={values.mileage} inputMode="numeric" name="mileage" />
          </Field>
          <Field errors={errors} label="Location" name="location">
            <input {...fieldAccessibility(errors, "location")} defaultValue={values.location} maxLength={100} name="location" />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Price and availability</legend>
        <div className="admin-vehicle-form-grid">
          <Field errors={errors} label="Price" name="price">
            <input {...fieldAccessibility(errors, "price")} defaultValue={values.price} inputMode="decimal" name="price" />
          </Field>
          <Field errors={errors} label="Currency" name="currency">
            <input {...fieldAccessibility(errors, "currency")} defaultValue={values.currency} maxLength={3} name="currency" />
          </Field>
          <Field errors={errors} label="Inventory type" name="inventoryType" required>
            <select {...fieldAccessibility(errors, "inventoryType")} defaultValue={values.inventoryType} name="inventoryType">
              <option value="LOCAL_STOCK">Local stock</option>
              <option value="IMPORT_ORDER">Import order</option>
              <option value="IN_TRANSIT">In transit</option>
            </select>
          </Field>
          <label className="admin-checkbox-field">
            <input defaultChecked={values.showPrice} name="showPrice" type="checkbox" />
            Show price publicly when this draft is later published
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Import details</legend>
        <p className="admin-field-help">
          These details are used for import orders and in-transit cars. They are cleared for local stock.
        </p>
        <div className="admin-vehicle-form-grid">
          <Field errors={errors} label="Origin country" name="originCountry">
            <input {...fieldAccessibility(errors, "originCountry")} defaultValue={values.originCountry} maxLength={80} name="originCountry" />
          </Field>
          <Field errors={errors} label="Minimum lead time (days)" name="estimatedLeadTimeMinDays">
            <input {...fieldAccessibility(errors, "estimatedLeadTimeMinDays")} defaultValue={values.estimatedLeadTimeMinDays} inputMode="numeric" name="estimatedLeadTimeMinDays" />
          </Field>
          <Field errors={errors} label="Maximum lead time (days)" name="estimatedLeadTimeMaxDays">
            <input {...fieldAccessibility(errors, "estimatedLeadTimeMaxDays")} defaultValue={values.estimatedLeadTimeMaxDays} inputMode="numeric" name="estimatedLeadTimeMaxDays" />
          </Field>
          <Field errors={errors} label="Shipping estimate" name="shippingCostEstimate">
            <input {...fieldAccessibility(errors, "shippingCostEstimate")} defaultValue={values.shippingCostEstimate} inputMode="decimal" name="shippingCostEstimate" />
          </Field>
          <Field errors={errors} label="Clearing estimate" name="clearingCostEstimate">
            <input {...fieldAccessibility(errors, "clearingCostEstimate")} defaultValue={values.clearingCostEstimate} inputMode="decimal" name="clearingCostEstimate" />
          </Field>
          <Field errors={errors} label="Other import estimate" name="otherImportCostEstimate">
            <input {...fieldAccessibility(errors, "otherImportCostEstimate")} defaultValue={values.otherImportCostEstimate} inputMode="decimal" name="otherImportCostEstimate" />
          </Field>
          <Field errors={errors} label="Import currency" name="importCurrency">
            <input {...fieldAccessibility(errors, "importCurrency")} defaultValue={values.importCurrency} maxLength={3} name="importCurrency" />
          </Field>
        </div>
        <Field errors={errors} label="Import notes" name="importNotes">
          <textarea {...fieldAccessibility(errors, "importNotes")} defaultValue={values.importNotes} maxLength={2000} name="importNotes" rows={4} />
        </Field>
      </fieldset>

      <Field errors={errors} label="Description" name="description">
        <textarea {...fieldAccessibility(errors, "description")} defaultValue={values.description} maxLength={5000} name="description" rows={6} />
      </Field>

      <div className="admin-vehicle-form-actions">
        <button aria-disabled={pending} disabled={pending} type="submit">
          {pending ? "Saving…" : vehicle ? "Save draft changes" : "Create draft car"}
        </button>
      </div>
    </form>
  );
}
