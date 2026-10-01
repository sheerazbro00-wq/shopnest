// Shared input helpers for controllers.

const httpError = (status, message) => Object.assign(new Error(message), { status });

// Coerce to a trimmed string — also blocks NoSQL operator objects like { "$ne": null }.
const clean = (v, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

const normalizePhone = (p) => clean(p, 20).replace(/[\s-]/g, "");
const isPkMobile = (p) => /^(\+92|0)?3\d{9}$/.test(p);
const PHONE_HINT = "Enter a valid mobile number, e.g. 03001234567";

// Validates and normalizes a Pakistani shipping address; throws a 400 on bad input.
function readAddress(a = {}, { requirePhone = true } = {}) {
  const address = {
    firstName: clean(a.firstName, 60),
    lastName: clean(a.lastName, 60),
    address: clean(a.address, 200),
    apartment: clean(a.apartment, 100),
    city: clean(a.city, 60),
    postalCode: clean(a.postalCode, 10),
    country: "Pakistan",
  };
  for (const field of ["firstName", "lastName", "address", "city"]) {
    if (!address[field]) throw httpError(400, "Please complete the address");
  }
  if (requirePhone) {
    address.phone = normalizePhone(a.phone);
    if (!isPkMobile(address.phone)) throw httpError(400, PHONE_HINT);
  }
  return address;
}

module.exports = { httpError, clean, isEmail, normalizePhone, isPkMobile, PHONE_HINT, readAddress };
