const { uploadsEnabled } = require("../config/cloudinary");
const { signUpload } = require("../services/cloudinarySign");

// POST /api/admin/uploads/sign — a one-hour "permission slip" for uploading one or
// more product photos straight to Cloudinary (plan 002 §1). Admin-only via the router (R-1).
const signImageUpload = (req, res) => {
  if (!uploadsEnabled) return res.status(503).json({ message: "Image upload isn't set up" });
  res.set("Cache-Control", "no-store");
  res.json(signUpload());
};

module.exports = { signImageUpload };
