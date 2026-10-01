import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "../Icons";
import "./TopFilterBar.css";

const QUICK_DISCOUNTS = ["40", "60"];

export default function TopFilterBar({ facets, filters, toggle, setValue }) {
  const [sizeOpen, setSizeOpen] = useState(false);
  const sizeRef = useRef(null);
  const activeDiscount = filters.discount.length === 1 ? filters.discount[0] : null;

  useEffect(() => {
    if (!sizeOpen) return;
    const close = (e) => !sizeRef.current?.contains(e.target) && setSizeOpen(false);
    const onKey = (e) => e.key === "Escape" && setSizeOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [sizeOpen]);

  return (
    <div className="top-filter-bar">
      <div className="top-filter-bar__inner page-width">
        <div className="top-filter-bar__discounts">
          {QUICK_DISCOUNTS.map((d) => (
            <button
              key={d}
              type="button"
              className={`top-filter-bar__item${activeDiscount === d ? " is-active" : ""}`}
              onClick={() => setValue("discount", d)}
            >
              {d}%
            </button>
          ))}
          <button
            type="button"
            className={`top-filter-bar__item${filters.discount.length === 0 ? " is-active" : ""}`}
            onClick={() => setValue("discount", "")}
          >
            View All
          </button>
        </div>

        <div className={`top-size-filter${sizeOpen ? " is-open" : ""}`} ref={sizeRef}>
          <button
            type="button"
            className="top-filter-bar__item top-size-filter__summary"
            aria-expanded={sizeOpen}
            onClick={() => setSizeOpen((o) => !o)}
          >
            <span>SIZE</span>
            <ChevronDown className="top-size-filter__chevron" />
          </button>

          {sizeOpen && (
            <div className="top-size-filter__dropdown">
              <div className="top-size-filter__heading">SIZE</div>
              <div className="top-size-filter__values">
                {facets?.sizes.map((s) => (
                  <label key={s.value} className="top-size-filter__value">
                    <input
                      type="checkbox"
                      checked={filters.size.includes(s.value)}
                      onChange={() => toggle("size", s.value)}
                    />
                    <span className="top-size-filter__checkbox" aria-hidden="true" />
                    <span>{s.value}</span>
                    <span className="top-size-filter__count">({s.count})</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
