import { useEffect, useState } from "react";
import { formatPrice } from "../../utils/format";

// Two overlaid range inputs; commits to the URL only when the thumb is released.
export default function PriceRange({ min, max, valueMin, valueMax, onCommit }) {
  const lo = valueMin === "" ? min : Math.max(min, Number(valueMin));
  const hi = valueMax === "" ? max : Math.min(max, Number(valueMax));
  const [range, setRange] = useState([lo, hi]);

  useEffect(() => setRange([lo, hi]), [lo, hi]);

  if (max <= min) return null;

  const commit = () => {
    const [a, b] = range;
    onCommit(a <= min ? "" : String(a), b >= max ? "" : String(b));
  };

  const pct = (v) => ((v - min) / (max - min)) * 100;
  const step = Math.max(1, Math.round((max - min) / 200));

  return (
    <div className="price-range">
      <div className="price-range__labels">
        <span>{formatPrice(range[0])}</span>
        <span>{formatPrice(range[1])}</span>
      </div>
      <div className="price-range__track">
        <div className="price-range__fill" style={{ left: `${pct(range[0])}%`, right: `${100 - pct(range[1])}%` }} />
        <input
          type="range"
          aria-label="Minimum price"
          min={min}
          max={max}
          step={step}
          value={range[0]}
          onChange={(e) => setRange(([, b]) => [Math.min(Number(e.target.value), b), b])}
          onPointerUp={commit}
          onKeyUp={commit}
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={min}
          max={max}
          step={step}
          value={range[1]}
          onChange={(e) => setRange(([a]) => [a, Math.max(Number(e.target.value), a)])}
          onPointerUp={commit}
          onKeyUp={commit}
        />
      </div>
    </div>
  );
}
