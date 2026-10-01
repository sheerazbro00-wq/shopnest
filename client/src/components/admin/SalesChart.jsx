import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { rupees, rupeesCompact, shortDay } from "./format";

const M = { top: 12, right: 16, bottom: 28, left: 64 };

// Round the axis max up to a clean 1 / 2 / 2.5 / 5 x 10^n step.
function niceScale(max, ticks = 4) {
  if (max <= 0) return { top: 1000, step: 250 };
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  return { top: step * Math.ceil(max / step), step };
}

// Single-series area chart of daily sales with a hover/keyboard crosshair.
export default function SalesChart({ series }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(null);
  const height = width && width < 560 ? 200 : 260;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => setActive(null), [series]);

  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;
  const max = Math.max(...series.map((d) => d.sales), 0);
  const { top, step } = niceScale(max);
  const x = (i) => M.left + (series.length > 1 ? (i / (series.length - 1)) * innerW : innerW / 2);
  const y = (v) => M.top + innerH - (v / top) * innerH;

  const line = series.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.sales).toFixed(1)}`).join(" ");
  const area = series.length ? `${line} L${x(series.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z` : "";
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  // ~6 evenly spaced date labels, always including the last day.
  const every = Math.max(1, Math.ceil(series.length / (width < 560 ? 4 : 6)));
  const labelIdx = series.map((_, i) => i).filter((i) => (series.length - 1 - i) % every === 0);

  const pick = (clientX) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = clientX - rect.left - M.left;
    const i = Math.round((px / innerW) * (series.length - 1));
    setActive(Math.min(series.length - 1, Math.max(0, i)));
  };

  const onKey = (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const last = series.length - 1;
    setActive((i) => {
      if (e.key === "Home") return 0;
      if (e.key === "End") return last;
      const cur = i ?? last;
      return Math.min(last, Math.max(0, cur + (e.key === "ArrowRight" ? 1 : -1)));
    });
  };

  const a = active != null ? series[active] : null;
  const tipLeft = a ? Math.min(Math.max(x(active), 90), width - 90) : 0;

  return (
    <div className="sales-chart" ref={wrapRef}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Daily sales for the last ${series.length} days. Use left and right arrow keys to read each day.`}
          tabIndex={0}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="sales-chart__grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
              <text className="sales-chart__tick" x={M.left - 10} y={y(t) + 4} textAnchor="end">
                {rupeesCompact(t)}
              </text>
            </g>
          ))}
          {labelIdx.map((i) => (
            <text key={i} className="sales-chart__tick" x={x(i)} y={height - 8} textAnchor={i === series.length - 1 ? "end" : "middle"}>
              {shortDay(series[i].date)}
            </text>
          ))}
          <path className="sales-chart__area" d={area} />
          <path className="sales-chart__line" d={line} />
          {a && <line className="sales-chart__cross" x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + innerH} />}
          {series.length > 0 && !a && <circle className="sales-chart__dot" cx={x(series.length - 1)} cy={y(series[series.length - 1].sales)} r="4" />}
          {a && <circle className="sales-chart__dot" cx={x(active)} cy={y(a.sales)} r="5" />}
        </svg>
      )}
      {a && (
        <div className="sales-chart__tip" style={{ left: tipLeft }} aria-live="polite">
          <p className="sales-chart__tip-date">{new Date(`${a.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
          <p className="sales-chart__tip-value">{rupees(a.sales)}</p>
          <p className="sales-chart__tip-sub">
            {a.orders} {a.orders === 1 ? "order" : "orders"}
          </p>
        </div>
      )}
      <table className="visually-hidden">
        <caption>Daily sales</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Sales</th>
            <th scope="col">Orders</th>
          </tr>
        </thead>
        <tbody>
          {series.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{rupees(d.sales)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
