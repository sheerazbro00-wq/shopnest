import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { errorMessage } from "../../api/orders";
import AuthLayout from "../../components/auth/AuthLayout";
import Field from "../../components/checkout/Field";
import { isEmail } from "./validation";

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [sent, setSent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setError(email ? "Enter a valid email" : "Enter an email");
      return ref.current?.focus();
    }
    setSubmitting(true);
    setFormError("");
    try {
      const { message } = await requestPasswordReset(email.trim());
      setSent(message);
    } catch (err) {
      setFormError(errorMessage(err));
    }
    setSubmitting(false);
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to set a new password.">
      {sent ? (
        <div className="auth__success" role="status">
          {sent}
          {import.meta.env.DEV && <span className="auth__dev">Dev mode: no email service yet — the link is printed in the server console.</span>}
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          {formError && (
            <div className="co-banner" role="alert">
              {formError}
            </div>
          )}
          <Field
            ref={ref}
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            value={email}
            error={error}
            onChange={(_, v) => {
              setEmail(v);
              setError("");
            }}
          />
          <button type="submit" className="co-submit" disabled={submitting}>
            {submitting ? <span className="co-spinner" aria-label="Sending" /> : "Send reset link"}
          </button>
        </form>
      )}
      <p className="auth__alt">
        <Link to="/account/login" state={{ from: location.state?.from }}>
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
