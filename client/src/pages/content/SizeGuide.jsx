import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageLayout from "../../components/page/PageLayout";
import Collapsible from "../../components/common/Collapsible";
import { bottomsLetter, bottomsWaist, centimetres, inches, shoes, tops } from "../../data/sizeGuides";
import "./SizeGuide.css";

const UNIT_KEY = "shopnest_size_unit";

function readUnit() {
  try {
    return localStorage.getItem(UNIT_KEY) === "cm" ? "cm" : "in";
  } catch {
    return "in";
  }
}

function UnitToggle({ unit, onChange }) {
  return (
    <div className="unit-toggle" role="radiogroup" aria-label="Measurement unit">
      {[
        ["in", "IN"],
        ["cm", "CM"],
      ].map(([value, label]) => (
        <button key={value} type="button" role="radio" aria-checked={unit === value} className={unit === value ? "is-active" : ""} onClick={() => onChange(value)}>
          {label}
        </button>
      ))}
    </div>
  );
}

// Body-measurement table; first column stays pinned while the rest scrolls on phones.
function SizeTable({ caption, sizeLabel = "Size", columns, rows, unit }) {
  return (
    <div className="size-table" role="region" aria-label={caption} tabIndex={0}>
      <table>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{sizeLabel}</th>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c} <span className="size-table__unit">({unit})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.size}>
              <th scope="row">{r.size}</th>
              {r.values.map((v, i) => (
                <td key={i}>{inches(v, unit)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Line drawing of a shirt and trousers with the four numbered measuring points.
function MeasureFigure() {
  const Num = ({ x, y, n }) => (
    <g className="measure-figure__num">
      <circle cx={x} cy={y} r="8" />
      <text x={x} y={y + 3.5} textAnchor="middle">
        {n}
      </text>
    </g>
  );
  return (
    <svg className="measure-figure" viewBox="0 0 220 300" role="img" aria-label="Where to measure chest, waist, hip and inside leg">
      <path className="measure-figure__garment" d="M92 14 Q110 30 128 14 L150 20 L190 48 L172 72 L150 60 L150 122 L70 122 L70 60 L48 72 L30 48 L70 20 Z" />
      <path className="measure-figure__garment" d="M76 130 L144 130 L150 290 L118 290 L110 186 L102 290 L70 290 Z" />
      <line className="measure-figure__line" x1="70" y1="74" x2="150" y2="74" />
      <line className="measure-figure__line" x1="76" y1="138" x2="144" y2="138" />
      <line className="measure-figure__line" x1="73" y1="164" x2="147" y2="164" />
      <line className="measure-figure__line" x1="110" y1="190" x2="110" y2="286" />
      <Num x={56} y={74} n={1} />
      <Num x={60} y={138} n={2} />
      <Num x={58} y={164} n={3} />
      <Num x={124} y={240} n={4} />
    </svg>
  );
}

// Which bar/box a deep link (#tops, #bottoms, #shoes) should open.
const LINKS = { tops: ["man", "tops"], bottoms: ["man", "bottoms"], shoes: ["shoes", null] };

export default function SizeGuide() {
  const { hash } = useLocation();
  const [unit, setUnitState] = useState(readUnit);
  const [bar, setBar] = useState("man");
  const [box, setBox] = useState("tops");

  const setUnit = (u) => {
    setUnitState(u);
    try {
      localStorage.setItem(UNIT_KEY, u);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
  };

  useEffect(() => {
    const target = LINKS[hash.slice(1)];
    if (!target) return;
    setBar(target[0]);
    if (target[1]) setBox(target[1]);
    // wait for the panel to open before scrolling to it
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }), 380);
    return () => clearTimeout(t);
  }, [hash]);

  const toggleBar = (name) => setBar((b) => (b === name ? null : name));
  const toggleBox = (name) => setBox((b) => (b === name ? null : name));

  return (
    <PageLayout title="Size Guides">
      <div className="size-guide">
        <div className="size-guide__toolbar">
          <span className="size-guide__toolbar-label">Show measurements in</span>
          <UnitToggle unit={unit} onChange={setUnit} />
        </div>

        <Collapsible id="man" variant="bar" title="Man Size Guide" open={bar === "man"} onToggle={() => toggleBar("man")}>
          <div className="size-guide__panel">
            <div className="measure">
              <div className="measure__text">
                <p className="measure__title">What to measure</p>
                <ol>
                  <li>
                    <strong>Chest</strong>: Measure across the fullest part.
                  </li>
                  <li>
                    <strong>Waist</strong>: Measure around the natural waistline.
                  </li>
                  <li>
                    <strong>Hip</strong>: Measure at the widest part.
                  </li>
                  <li>
                    <strong>Inside leg</strong>: Measure from top of inside leg at the crotch to the anklebone.
                  </li>
                </ol>
                <p className="measure__tip">
                  Measure over light clothing with the tape snug but not tight. Between two sizes? Choose the larger one for a relaxed fit.
                </p>
              </div>
              <MeasureFigure />
            </div>

            <Collapsible id="tops" variant="box" title="Size Guide - Tops" open={box === "tops"} onToggle={() => toggleBox("tops")}>
              <p className="size-guide__note">Shirts, T-shirts, polos, knitwear and outerwear. These are body measurements — find your chest first.</p>
              <SizeTable caption="Tops size guide" columns={tops.columns} rows={tops.rows} unit={unit} />
            </Collapsible>

            <Collapsible id="bottoms" variant="box" title="Size Guide - Bottoms" open={box === "bottoms"} onToggle={() => toggleBox("bottoms")}>
              <p className="size-guide__note">Jeans, chinos and trousers come in waist sizes; shorts, joggers and relaxed fits come in S–XXL.</p>
              <div className="size-guide__pair">
                <SizeTable caption="Bottoms in waist sizes" sizeLabel="Waist size" columns={bottomsWaist.columns} rows={bottomsWaist.rows} unit={unit} />
                <SizeTable caption="Bottoms in letter sizes" columns={bottomsLetter.columns} rows={bottomsLetter.rows} unit={unit} />
              </div>
            </Collapsible>

            <p className="size-guide__foot">
              Every product page also has its own <strong>size chart</strong> with the garment&rsquo;s exact measurements.
            </p>
          </div>
        </Collapsible>

        <Collapsible id="shoes" variant="bar" title="Shoes Size Guide" open={bar === "shoes"} onToggle={() => toggleBar("shoes")}>
          <div className="size-guide__panel">
            <div className="measure measure--shoes">
              <div className="measure__text">
                <p className="measure__title">How to measure your foot</p>
                <ol>
                  <li>Stand on a sheet of paper with your heel against a wall.</li>
                  <li>Mark the tip of your longest toe.</li>
                  <li>Measure from the wall to the mark — that is your foot length.</li>
                  <li>Find your foot length below. Measure both feet and use the longer one.</li>
                </ol>
              </div>
            </div>
            <div className="size-table" role="region" aria-label="Shoes size guide" tabIndex={0}>
              <table>
                <caption className="visually-hidden">Shoes size guide</caption>
                <thead>
                  <tr>
                    <th scope="col">EU</th>
                    <th scope="col">
                      Foot length <span className="size-table__unit">({unit})</span>
                    </th>
                    <th scope="col">UK</th>
                    <th scope="col">US</th>
                  </tr>
                </thead>
                <tbody>
                  {shoes.map((s) => (
                    <tr key={s.eu}>
                      <th scope="row">{s.eu}</th>
                      <td>{centimetres(s.foot, unit)}</td>
                      <td>{s.uk}</td>
                      <td>{s.us}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="size-guide__foot">
              Our shoes are sold in EU sizes. Still unsure? <Link to="/pages/contact">Ask us</Link> — we&rsquo;re happy to help.
            </p>
          </div>
        </Collapsible>
      </div>
    </PageLayout>
  );
}
