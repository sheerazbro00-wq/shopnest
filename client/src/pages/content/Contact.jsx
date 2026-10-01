import { useEffect, useRef, useState } from "react";
import { sendContactMessage } from "../../api/contact";
import { errorMessage } from "../../api/orders";
import { useAuth } from "../../context/AuthContext";
import PageLayout from "../../components/page/PageLayout";
import { store } from "../../data/store";
import "./Contact.css";

const MIN_MESSAGE = 10;
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function validate({ name, email, message }) {
  const errors = {};
  if (!name.trim()) errors.name = "Enter your name";
  if (!email.trim()) errors.email = "Enter your email";
  else if (!isEmail(email.trim())) errors.email = "Enter a valid email";
  if (!message.trim()) errors.message = "Enter a message";
  else if (message.trim().length < MIN_MESSAGE) errors.message = `Message should be at least ${MIN_MESSAGE} characters`;
  return errors;
}

function ContactField({ id, label, error, multiline = false, ...props }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <div className={`contact-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <Tag id={id} className="input-full" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && (
        <p id={`${id}-error`} className="contact-field__error">
          {error}
        </p>
      )}
    </div>
  );
}

export default function Contact() {
  const { user } = useAuth();
  const empty = { name: user?.name || "", email: user?.email || "", message: "", website: "" };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const formRef = useRef(null);
  const noteRef = useRef(null);

  useEffect(() => {
    if (status === "sent") noteRef.current?.focus();
  }, [status]);

  const set = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined, form: undefined }));
  };

  const focusFirstError = (found) => {
    const first = ["name", "email", "message"].find((k) => found[k]);
    if (first) formRef.current?.elements[first]?.focus();
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(found);

    setStatus("sending");
    try {
      await sendContactMessage(form);
      setStatus("sent");
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      setErrors(fieldErrors || { form: errorMessage(err, "Couldn't send your message. Please try again.") });
      if (fieldErrors) focusFirstError(fieldErrors);
      setStatus("idle");
    }
  };

  const reset = () => {
    setForm((f) => ({ ...f, message: "", website: "" })); // keep name + email for a follow-up
    setErrors({});
    setStatus("idle");
  };

  return (
    <PageLayout title="Contact Us" compact>
      {status === "sent" ? (
        <div ref={noteRef} className="contact-note" tabIndex={-1} role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="contact-note__icon">
            <circle cx="12" cy="12" r="11" />
            <path d="m7 12.5 3.2 3.2L17 9" />
          </svg>
          <p className="contact-note__title">Thanks for contacting us.</p>
          <p>We&rsquo;ll get back to you at {form.email.trim()} as soon as possible.</p>
          <button type="button" className="contact-note__again" onClick={reset}>
            Send another message
          </button>
        </div>
      ) : (
        <form ref={formRef} className="contact-form" onSubmit={submit} noValidate>
          {errors.form && (
            <p className="contact-form__banner" role="alert">
              {errors.form}
            </p>
          )}
          <div className="contact-form__row">
            <ContactField id="ContactFormName" label="Name" name="name" value={form.name} onChange={set} error={errors.name} autoComplete="name" autoCapitalize="words" maxLength={100} />
            <ContactField id="ContactFormEmail" label="Email" name="email" type="email" value={form.email} onChange={set} error={errors.email} autoComplete="email" autoCapitalize="off" autoCorrect="off" maxLength={254} />
          </div>
          <ContactField id="ContactFormMessage" label="Message" name="message" rows={5} multiline value={form.message} onChange={set} error={errors.message} maxLength={5000} />

          {/* Honeypot: invisible to people, bots fill it in and get ignored */}
          <div className="contact-form__trap" aria-hidden="true">
            <label htmlFor="ContactFormWebsite">Website</label>
            <input id="ContactFormWebsite" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set} />
          </div>

          <button type="submit" className="btn contact-form__submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send"}
          </button>
          <p className="contact-form__disclaimer">We usually reply within one working day.</p>
        </form>
      )}

      <div className="contact-info">
        <p>
          For any queries or concerns, please contact us at <a href={store.phoneHref}>{store.phone}</a> from Monday to
          Saturday,
        </p>
        <p>
          between {store.opens} and {store.closes} (PST).
        </p>
        <p className="contact-info__address">Head office: {store.address}</p>
      </div>
    </PageLayout>
  );
}
