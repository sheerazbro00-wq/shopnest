// Cloudinary settings (spec 002). CLOUDINARY_URL uses Cloudinary's own format:
// cloudinary://<api_key>:<api_secret>@<cloud_name>. Without it, image upload is
// switched off and the editor falls back to pasting links (plan 002 §4).
const parse = (raw) => {
  try {
    const u = new URL(String(raw || "").trim());
    if (u.protocol !== "cloudinary:" || !u.hostname || !u.username || !u.password) return null;
    return { cloudName: u.hostname, apiKey: decodeURIComponent(u.username), apiSecret: decodeURIComponent(u.password) };
  } catch {
    return null;
  }
};

const config = parse(process.env.CLOUDINARY_URL);

module.exports = {
  uploadsEnabled: Boolean(config),
  cloudName: config?.cloudName || "",
  apiKey: config?.apiKey || "",
  apiSecret: config?.apiSecret || "",
};
