import "./QtySelector.css";

// − [n] + stepper. `min` is 1 on the product page; 0 in the cart, where
// stepping below 1 removes the line.
export default function QtySelector({ id, value, onChange, min = 1, max = 99, label = "Quantity" }) {
  const set = (n) => onChange(Math.max(min, Math.min(max, n)));

  return (
    <div className="qty-selector">
      <button type="button" aria-label="Reduce item quantity by one" onClick={() => set(value - 1)}>
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M1 5h8" />
        </svg>
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        aria-label={id ? undefined : label}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (Number.isFinite(n)) set(n);
        }}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" aria-label="Increase item quantity by one" onClick={() => set(value + 1)} disabled={value >= max}>
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M1 5h8M5 1v8" />
        </svg>
      </button>
    </div>
  );
}
