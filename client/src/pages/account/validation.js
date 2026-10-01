// Mirrors the server rules (server/controllers/authController.js) for instant feedback.
export const MIN_PASSWORD = 8;

export const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());

export const passwordError = (p) => {
  if (!p) return "Enter a password";
  if (p.length < MIN_PASSWORD) return `Use ${MIN_PASSWORD} or more characters`;
  return undefined;
};
