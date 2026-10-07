const { COUNTRIES } = require("../config/shop");
const { US_STATE_CODES } = require("../config/regions");

// Checkout contact + address, checked per country (spec 008 US-2, plan §3.4).
// Errors come back per field so the checkout can show them next to the input (AC-2.4).

const clean = (v, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const digitsOnly = (phone) => phone.replace(/[\s\-().]/g, "");

const RULES = {
  PK: {
    phone: /^(\+92|0)?3\d{9}$/,
    phoneError: "Enter a valid mobile number, e.g. 03001234567",
  },
  US: {
    phone: /^(\+?1)?[2-9]\d{2}[2-9]\d{6}$/,
    phoneError: "Enter a valid US phone number, e.g. (201) 555-0123",
    postal: /^\d{5}(-\d{4})?$/,
    postalError: "Enter a valid ZIP code, e.g. 10001",
  },
  GB: {
    phone: /^(\+44|0)\d{9,10}$/,
    phoneError: "Enter a valid UK phone number, e.g. 07400 123456",
    postal: /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/,
    postalError: "Enter a valid postcode, e.g. SW1A 1AA",
  },
};

// "sw1a1aa" → "SW1A 1AA"
const ukPostcode = (raw) => {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  return { compact, display: compact.length > 3 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact };
};

function readCustomer(body) {
  const countryCode = COUNTRIES[body.country] ? body.country : "PK";
  const rules = RULES[countryCode];
  const a = body.shippingAddress || {};
  const errors = {};

  const email = clean(body.email, 254).toLowerCase();
  const phone = digitsOnly(clean(body.phone, 25));
  const shippingAddress = {
    firstName: clean(a.firstName, 60),
    lastName: clean(a.lastName, 60),
    address: clean(a.address, 200),
    apartment: clean(a.apartment, 100),
    city: clean(a.city, 60),
    state: clean(a.state, 60),
    postalCode: clean(a.postalCode, 12),
    country: COUNTRIES[countryCode].name,
    countryCode,
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
  if (!rules.phone.test(phone)) errors.phone = phone ? rules.phoneError : "Enter a phone number";
  if (!shippingAddress.firstName) errors.firstName = "Enter a first name";
  if (!shippingAddress.lastName) errors.lastName = "Enter a last name";
  if (!shippingAddress.address) errors.address = "Enter an address";
  if (!shippingAddress.city) errors.city = countryCode === "GB" ? "Enter a town or city" : "Enter a city";

  if (countryCode === "PK") {
    shippingAddress.state = "";
  } else if (countryCode === "US") {
    shippingAddress.state = shippingAddress.state.toUpperCase();
    if (!US_STATE_CODES.has(shippingAddress.state)) errors.state = "Select a state";
    if (!rules.postal.test(shippingAddress.postalCode)) errors.postalCode = shippingAddress.postalCode ? rules.postalError : "Enter a ZIP code";
  } else {
    const { compact, display } = ukPostcode(shippingAddress.postalCode);
    if (!rules.postal.test(compact)) errors.postalCode = compact ? rules.postalError : "Enter a postcode";
    else shippingAddress.postalCode = display;
  }

  if (Object.keys(errors).length) {
    throw Object.assign(new Error("Please check the highlighted fields"), { status: 400, errors });
  }
  return { email, phone, shippingAddress, emailOptIn: Boolean(body.emailOptIn), countryCode };
}

module.exports = { readCustomer };
