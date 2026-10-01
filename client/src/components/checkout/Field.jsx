import { forwardRef } from "react";

// Shopify-style input: the label sits inside as a placeholder and shrinks
// to the top once the field has a value. `suffix` renders inside the box
// (e.g. a show-password button).
const Field = forwardRef(function Field({ label, name, value, onChange, error, className = "", children, suffix, ...rest }, ref) {
  const id = `co-${name}`;
  const errorId = `${id}-error`;
  const Tag = children ? "select" : "input";

  return (
    <div className={`co-field${value ? " has-value" : ""}${error ? " has-error" : ""} ${className}`}>
      <Tag
        ref={ref}
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      >
        {children}
      </Tag>
      <label htmlFor={id}>{label}</label>
      {children && (
        <svg className="co-field__chevron" viewBox="0 0 14 14" aria-hidden="true">
          <path d="m11.9 5.6-4.9 4.9-4.9-4.9" />
        </svg>
      )}
      {suffix}
      {error && (
        <p id={errorId} className="co-field__error">
          {error}
        </p>
      )}
    </div>
  );
});

export default Field;
