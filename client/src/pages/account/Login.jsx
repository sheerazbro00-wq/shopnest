import { useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { errorMessage } from "../../api/orders";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordField from "../../components/auth/PasswordField";
import Field from "../../components/checkout/Field";
import { isEmail } from "./validation";

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const from = location.state?.from || "/account";
  const [form, setForm] = useState({ email: location.state?.email || "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const refs = useRef({});

  // Signed in (already, or just now) -> go where the user was headed.
  if (user) return <Navigate to={from} replace />;

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!isEmail(form.email)) found.email = form.email ? "Enter a valid email" : "Enter an email";
    if (!form.password) found.password = "Enter your password";
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) return refs.current[first]?.focus();

    setSubmitting(true);
    setFormError("");
    try {
      await login(form.email.trim(), form.password);
    } catch (err) {
      setFormError(errorMessage(err));
      setSubmitting(false);
    }
  };

  const props = (name) => ({ name, value: form[name], onChange: set, error: errors[name], ref: (el) => (refs.current[name] = el) });

  return (
    <AuthLayout title="Sign in" subtitle="Sign in or create an account">
      <form onSubmit={submit} noValidate>
        {formError && (
          <div className="co-banner" role="alert">
            {formError}
          </div>
        )}
        <Field label="Email" type="email" autoComplete="email" inputMode="email" autoFocus {...props("email")} />
        <PasswordField label="Password" autoComplete="current-password" {...props("password")} />
        <Link to="/account/forgot-password" state={{ email: form.email, from }} className="auth__forgot">
          Forgot your password?
        </Link>
        <button type="submit" className="co-submit" disabled={submitting}>
          {submitting ? <span className="co-spinner" aria-label="Signing in" /> : "Sign in"}
        </button>
      </form>

      <div className="auth__divider">or</div>
      <Link to="/account/register" state={{ from }} className="auth__secondary">
        Create an account
      </Link>

      <p className="auth__terms">
        By continuing, you agree to our <Link to="/pages/terms-of-service">Terms of service</Link>
      </p>
    </AuthLayout>
  );
}
