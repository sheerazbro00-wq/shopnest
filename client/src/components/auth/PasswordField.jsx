import { forwardRef, useState } from "react";
import Field from "../checkout/Field";

const Eye = ({ open }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z" />
    <circle cx="10" cy="10" r="2.5" />
    {!open && <path d="M3 17 17 3" />}
  </svg>
);

const PasswordField = forwardRef(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      ref={ref}
      {...props}
      type={visible ? "text" : "password"}
      className="co-field--password"
      suffix={
        <button
          type="button"
          className="auth__eye"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          <Eye open={visible} />
        </button>
      }
    />
  );
});

export default PasswordField;
