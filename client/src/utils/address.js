import { US_STATES } from "../data/regions";

// Checkout contact + address checks per country — the same rules and messages as
// server/utils/address.js, which re-validates everything (spec 008 US-2).

const STATE_CODES = new Set(US_STATES.map(([code]) => code));
const compact = (phone) => phone.replace(/[\s\-().]/g, "");

export const ADDRESS_LABELS = {
  PK: { city: "City", postal: "Postal code (optional)", phone: "Phone" },
  US: { city: "City", postal: "ZIP code", phone: "Phone" },
  GB: { city: "Town/City", postal: "Postcode", phone: "Phone" },
};

const RULES = {
  PK: { phone: /^(\+92|0)?3\d{9}$/, phoneError: "Enter a valid mobile number, e.g. 03001234567" },
  US: {
    phone: /^(\+?1)?[2-9]\d{2}[2-9]\d{6}$/,
    phoneError: "Enter a valid US phone number, e.g. (201) 555-0123",
    postal: (v) => /^\d{5}(-\d{4})?$/.test(v.trim()),
    postalError: "Enter a valid ZIP code, e.g. 10001",
    postalMissing: "Enter a ZIP code",
  },
  GB: {
    phone: /^(\+44|0)\d{9,10}$/,
    phoneError: "Enter a valid UK phone number, e.g. 07400 123456",
    postal: (v) => /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(v.replace(/\s+/g, "").toUpperCase()),
    postalError: "Enter a valid postcode, e.g. SW1A 1AA",
    postalMissing: "Enter a postcode",
  },
};

export function validateCheckout(f) {
  const country = RULES[f.country] ? f.country : "PK";
  const rules = RULES[country];
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errors.email = f.email ? "Enter a valid email" : "Enter an email";
  if (!f.firstName.trim()) errors.firstName = "Enter a first name";
  if (!f.lastName.trim()) errors.lastName = "Enter a last name";
  if (!f.address.trim()) errors.address = "Enter an address";
  if (!f.city.trim()) errors.city = country === "GB" ? "Enter a town or city" : "Enter a city";
  if (country === "US" && !STATE_CODES.has(f.state)) errors.state = "Select a state";
  if (rules.postal && !rules.postal(f.postalCode)) errors.postalCode = f.postalCode.trim() ? rules.postalError : rules.postalMissing;
  if (!rules.phone.test(compact(f.phone))) errors.phone = f.phone ? rules.phoneError : "Enter a phone number";
  return errors;
}
