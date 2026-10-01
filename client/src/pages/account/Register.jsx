import { useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { errorMessage } from "../../api/orders";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordField from "../../components/auth/PasswordField";
import Field from "../../components/checkout/Field";
import { MIN_PASSWORD, isEmail, passwordError } from "./validation";

export default function Register() {
  const { user, register } = useAuth();
  const location = useLocation();
  const from = location.state?.from || "/account";
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", acceptsMarketing: true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const refs = useRef({});

  if (user) return <Navigate to={from} replace />;

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.firstName.trim()) found.firstName = "Enter your first name";
    if (!isEmail(form.email)) found.email = form.email ? "Enter a valid email" : "Enter an email";
    const pw = passwordError(form.password);
    if (pw) found.password = pw;
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) return refs.current[first]?.focus();

    setSubmitting(true);
    setFormError("");
    try {
      await register({ ...form, email: form.email.trim() });
    } catch (err) {
      setFormError(errorMessage(err));
      setSubmitting(false);
    }
  };

  const props = (name) => ({ name, value: form[name], onChange: set, error: errors[name], ref: (el) => (refs.current[name] = el) });
  const accountExists = formError.startsWith("An account with this email");

  return (
    <AuthLayout
      title="Create account"
      subtitle={
        <>
          Already have an account?{" "}
          <Link to="/account/login" state={{ from }}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        {formError && (
          <div className="co-banner" role="alert">
            {formError}{" "}
            {accountExists && (
              <Link to="/account/login" state={{ from, email: form.email }} className="co-link">
                Sign in
              </Link>
            )}
          </div>
        )}
        <div className="co-row">
          <Field label="First name" autoComplete="given-name" autoFocus {...props("firstName")} />
          <Field label="Last name (optional)" autoComplete="family-name" {...props("lastName")} />
        </div>
        <Field label="Email" type="email" autoComplete="email" inputMode="email" {...props("email")} />
        <PasswordField label="Password" autoComplete="new-password" {...props("password")} />
        {!errors.password && <p className="auth__hint">Use {MIN_PASSWORD} or more characters.</p>}
        <label className="co-check">
          <input type="checkbox" checked={form.acceptsMarketing} onChange={(e) => set("acceptsMarketing", e.target.checked)} />
          <span className="co-check__box" />
          Email me with news and offers
        </label>
        <button type="submit" className="co-submit" disabled={submitting}>
          {submitting ? <span className="co-spinner" aria-label="Creating account" /> : "Create account"}
        </button>
      </form>

      <p className="auth__terms">
        By creating an account, you agree to our <Link to="/pages/terms-of-service">Terms of service</Link> and{" "}
        <Link to="/pages/privacy-policy">Privacy policy</Link>
      </p>
    </AuthLayout>
  );
}
