const crypto = require("crypto");
const { cloudName, apiKey, apiSecret } = require("../config/cloudinary");

// Signed upload params for one browser → Cloudinary upload (plan 002 §5).
// The browser must send `params` unchanged: altering any of them breaks the signature.
const UPLOAD_RULES = {
  folder: "shopnest/products",
  // Cloudinary checks the real file contents, not the name (R-4).
  allowed_formats: "jpg,jpeg,png,webp,heic,heif",
  // Re-encoding the original strips EXIF/GPS (R-3), applies the phone's rotation
  // (AC-4.3) and keeps stored files small.
  transformation: "c_limit,w_2400,h_2400/q_auto:good",
  // HEIC is converted, so every browser can show the result.
  format: "jpg",
};

// Cloudinary's scheme: sort the params, join as key=value&key=value, append the
// secret, SHA-1. The secret never leaves the server (R-2).
const sign = (params) => {
  const payload = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(payload + apiSecret).digest("hex");
};

function signUpload() {
  const params = { ...UPLOAD_RULES, timestamp: Math.floor(Date.now() / 1000) };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    apiKey,
    params,
    signature: sign(params),
  };
}

module.exports = { signUpload, sign, UPLOAD_RULES };
