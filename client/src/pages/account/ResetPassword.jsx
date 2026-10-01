import { useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { errorMessage } from "../../api/orders";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordField from "../../components/auth/PasswordField";
import { MIN_PASSWORD, passwordError } from "./validation";

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const refs = useRef({});

  if (done) return <Navigate to="/account" replace />;

  if (!token) {
    return (
      <AuthLayout title="Link not valid" subtitle="This password reset link is incomplete.">
        <Link to="/account/forgot-password" className="auth__secondary">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    const pw = passwordError(form.password);
    if (pw) found.password = pw;
    else if (form.confirm !== form.password) found.confirm = "Passwords don't match";
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) return refs.current[first]?.focus();

    setSubmitting(true);
    setFormError("");
    try {
      await resetPassword(token, form.password);
      setDone(true);
    } catch (err) {
      setFormError(errorMessage(err));
      setSubmitting(false);
    }
  };

  const props = (name) => ({ name, value: form[name], onChange: set, error: errors[name], ref: (el) => (refs.current[name] = el) });

  return (
    <AuthLayout title="Set a new password" subtitle={`Use ${MIN_PASSWORD} or more characters.`}>
      <form onSubmit={submit} noValidate>
        {formError && (
          <div className="co-banner" role="alert">
            {formError}{" "}
            <Link to="/account/forgot-password" className="co-link">
              Request a new link
            </Link>
          </div>
        )}
        <PasswordField label="New password" autoComplete="new-password" autoFocus {...props("password")} />
        <PasswordField label="Confirm new password" autoComplete="new-password" {...props("confirm")} />
        <button type="submit" className="co-submit" disabled={submitting}>
          {submitting ? <span className="co-spinner" aria-label="Saving" /> : "Save password"}
        </button>
      </form>
    </AuthLayout>
  );
}
