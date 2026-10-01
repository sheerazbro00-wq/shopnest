import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Field from "../checkout/Field";
import { CloseIcon } from "../Icons";
import { CITIES } from "../../data/cities";
import { errorMessage } from "../../api/orders";

const EMPTY = { firstName: "", lastName: "", address: "", apartment: "", city: "", postalCode: "", phone: "", isDefault: false };

function validate(f) {
  const e = {};
  if (!f.firstName.trim()) e.firstName = "Enter a first name";
  if (!f.lastName.trim()) e.lastName = "Enter a last name";
  if (!f.address.trim()) e.address = "Enter an address";
  if (!f.city.trim()) e.city = "Enter a city";
  if (!/^(\+92|0)?3\d{9}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = f.phone ? "Enter a valid mobile number, e.g. 03001234567" : "Enter a phone number";
  return e;
}

// Add / edit address dialog. `onSave(fields)` should return a promise.
export default function AddressModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => ({ ...EMPTY, ...initial }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const refs = useRef({});
  const editing = Boolean(initial?._id);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) return refs.current[first]?.focus();
    setSaving(true);
    setFormError("");
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setFormError(errorMessage(err));
      setSaving(false);
    }
  };

  const props = (name) => ({ name, value: form[name], onChange: set, error: errors[name], ref: (el) => (refs.current[name] = el) });

  return createPortal(
    <div className="co acc-modal" role="dialog" aria-modal="true" aria-label={editing ? "Edit address" : "Add address"} onMouseDown={onClose}>
      <form className="acc-modal__card" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="acc-modal__head">
          <h2>{editing ? "Edit address" : "Add address"}</h2>
          <button type="button" className="acc-modal__close" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        {formError && <div className="co-banner">{formError}</div>}
        <label className="co-check acc-modal__default">
          <input type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} />
          <span className="co-check__box" />
          This is my default address
        </label>
        <Field label="Country/Region" name="country" value="Pakistan" onChange={() => {}}>
          <option value="Pakistan">Pakistan</option>
        </Field>
        <div className="co-row">
          <Field label="First name" autoComplete="given-name" autoFocus {...props("firstName")} />
          <Field label="Last name" autoComplete="family-name" {...props("lastName")} />
        </div>
        <Field label="Address" autoComplete="address-line1" {...props("address")} />
        <Field label="Apartment, suite, etc. (optional)" autoComplete="address-line2" {...props("apartment")} />
        <div className="co-row">
          <Field label="City" autoComplete="address-level2" list="acc-cities" {...props("city")} />
          <Field label="Postal code (optional)" autoComplete="postal-code" inputMode="numeric" {...props("postalCode")} />
        </div>
        <datalist id="acc-cities">
          {CITIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Field label="Phone" type="tel" autoComplete="tel" inputMode="tel" {...props("phone")} />
        <div className="acc-modal__actions">
          <button type="button" className="acc-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="co-submit co-submit--inline" disabled={saving}>
            {saving ? <span className="co-spinner" aria-label="Saving" /> : "Save"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
