import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "../Icons";
import { cmToFtIn, cmToIn, formatLength, ftInToCm, inToCm, kgToLb, lbToKg, recommend, reasonFor } from "../../utils/sizeFinder";
import { forgetProfile, inRange, loadProfile, saveProfile } from "../../utils/fitProfile";
import "./FindMySize.css";

// The Find My Size sheet (spec 005, plan §5): unit → questions → result.
// Everything is computed on the device; answers never leave it (R-1).

const FITS = [
  { value: "slim", label: "Slim" },
  { value: "regular", label: "Regular" },
  { value: "relaxed", label: "Relaxed" },
];
const SHOE_SYSTEMS = ["UK", "EU", "US"]; // UK first: most Pakistani shoppers know their UK size
const TITLES = { tops: "Find your size", bottoms: "Find your size", shoes: "Find your shoe size" };

const num = (v) => (v === "" || v == null ? NaN : Number(v));
const round1 = (n) => Math.round(n * 10) / 10;

// Saved (metric) answers → form strings in the chosen unit.
function toForm(kind, saved, units, weightUnit) {
  const a = saved || {};
  const f = { fit: a.fit || "regular", knowExact: Boolean(a.chestCm || a.waistCm) };
  if (kind === "tops") {
    if (units === "in" && a.heightCm) Object.assign(f, { ft: String(cmToFtIn(a.heightCm).ft), inch: String(cmToFtIn(a.heightCm).in) });
    else f.height = a.heightCm ? String(Math.round(a.heightCm)) : "";
    f.weight = a.weightKg ? String(Math.round(weightUnit === "lb" ? kgToLb(a.weightKg) : a.weightKg)) : "";
    f.chest = a.chestCm ? String(round1(units === "in" ? cmToIn(a.chestCm) : a.chestCm)) : "";
  }
  if (kind === "bottoms") {
    f.waistSize = a.waistSize ? String(a.waistSize) : "";
    f.waist = a.waistCm ? String(round1(units === "in" ? cmToIn(a.waistCm) : a.waistCm)) : "";
  }
  if (kind === "shoes") Object.assign(f, { system: a.system || "UK", size: a.size != null ? String(a.size) : "" });
  return f;
}

// Form → metric answers, or { errors }.
function fromForm(kind, f, units, weightUnit) {
  const errors = {};
  const len = (v) => (units === "in" ? inToCm(num(v)) : num(v));
  if (kind === "tops") {
    const heightCm = units === "in" ? ftInToCm(num(f.ft) || 0, num(f.inch) || 0) : num(f.height);
    const weightKg = weightUnit === "lb" ? lbToKg(num(f.weight)) : num(f.weight);
    if (!inRange("heightCm", heightCm)) errors.height = units === "in" ? "Enter a height between 4 ft 7 in and 6 ft 11 in" : "Enter a height between 140 and 210 cm";
    if (!inRange("weightKg", weightKg)) errors.weight = weightUnit === "lb" ? "Enter a weight between 88 and 353 lb" : "Enter a weight between 40 and 160 kg";
    const chestCm = f.knowExact && f.chest !== "" ? len(f.chest) : undefined;
    if (chestCm !== undefined && !inRange("chestCm", chestCm)) errors.chest = units === "in" ? "Enter a chest between 28 and 59 in" : "Enter a chest between 70 and 150 cm";
    return Object.keys(errors).length ? { errors } : { answers: { heightCm, weightKg, fit: f.fit, ...(chestCm && { chestCm }) } };
  }
  if (kind === "bottoms") {
    const waistSize = num(f.waistSize);
    const waistCm = f.knowExact && f.waist !== "" ? len(f.waist) : undefined;
    if (!inRange("waistSize", waistSize)) errors.waistSize = "Enter the waist size you usually wear, 26 to 44";
    if (waistCm !== undefined && !inRange("waistCm", waistCm)) errors.waist = units === "in" ? "Enter a waist between 24 and 51 in" : "Enter a waist between 60 and 130 cm";
    return Object.keys(errors).length ? { errors } : { answers: { waistSize, fit: f.fit, ...(waistCm && { waistCm }) } };
  }
  const size = num(f.size);
  if (!Number.isFinite(size) || size < 2 || size > 50) errors.size = "Enter your usual shoe size, e.g. 8";
  return Object.keys(errors).length ? { errors } : { answers: { system: f.system, size } };
}

function Field({ id, label, suffix, error, ...input }) {
  return (
    <div className={`fms-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <span className="fms-input">
        <input id={id} inputMode="decimal" autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...input} />
        {suffix && <span className="fms-input__suffix">{suffix}</span>}
      </span>
      {error && (
        <p className="fms-error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function FindMySize({ chart, available, startWith = "auto", onSelect, onShowChart, onClose }) {
  const kind = chart.kind;
  const [profile, setProfile] = useState(loadProfile);
  const units = profile.units || "cm";
  const weightUnit = profile.weightUnit || "kg";
  const saved = profile[kind];
  const [step, setStep] = useState(() => {
    if (kind !== "shoes" && !profile.units) return "unit";
    if (startWith === "edit" || !saved) return "questions";
    return "result";
  });
  const [form, setForm] = useState(() => toForm(kind, saved, units, weightUnit));
  const [errors, setErrors] = useState({});
  const closeRef = useRef(null);
  const headingRef = useRef(null);

  const result = saved ? recommend(chart, saved, available) : null;

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => headingRef.current?.focus(), [step]);

  // Feet and inches share one error ("height").
  const ERROR_OF = { ft: "height", inch: "height" };
  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [ERROR_OF[name] || name]: undefined }));
  };

  const update = (patch) => {
    const next = { ...profile, ...patch };
    saveProfile(next);
    setProfile(next);
    return next;
  };

  const chooseUnits = (u) => {
    const next = update({ units: u, weightUnit: profile.weightUnit || "kg" });
    setForm(toForm(kind, next[kind], u, next.weightUnit));
    setStep("questions");
  };

  const switchWeightUnit = (wu) => {
    // Keep what was typed: convert the number rather than clearing it.
    const w = num(form.weight);
    if (Number.isFinite(w)) set("weight", String(Math.round(wu === "lb" ? kgToLb(w) : lbToKg(w))));
    update({ weightUnit: wu });
  };

  const submit = (e) => {
    e.preventDefault();
    const out = fromForm(kind, form, units, weightUnit);
    if (out.errors) return setErrors(out.errors);
    update({ [kind]: out.answers });
    setStep("result");
  };

  const forget = () => {
    forgetProfile();
    const fresh = loadProfile();
    setProfile(fresh);
    setForm(toForm(kind, null, "cm", "kg"));
    setStep(kind === "shoes" ? "questions" : "unit");
  };

  const pick = (size) => {
    onSelect(size);
    onClose();
  };

  const f = (cm) => formatLength(cm, units);

  return createPortal(
    <div className="fms-overlay" onClick={onClose}>
      <div className="fms-sheet" role="dialog" aria-modal="true" aria-labelledby="fms-title" onClick={(e) => e.stopPropagation()}>
        <div className="fms-head">
          <h2 id="fms-title" className="fms-title" tabIndex={-1} ref={headingRef}>
            {TITLES[kind]}
          </h2>
          <button type="button" className="fms-close" ref={closeRef} aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {step === "unit" && (
          <div className="fms-body">
            <p className="fms-lead">How do you measure?</p>
            <div className="fms-units">
              <button type="button" className="fms-unit" onClick={() => chooseUnits("cm")}>
                <strong>Centimetres</strong>
                <span>cm · kg</span>
              </button>
              <button type="button" className="fms-unit" onClick={() => chooseUnits("in")}>
                <strong>Inches</strong>
                <span>ft · in · kg</span>
              </button>
            </div>
            <p className="fms-note">Your answers stay on this device.</p>
          </div>
        )}

        {step === "questions" && (
          <form className="fms-body" onSubmit={submit} noValidate>
            {kind !== "shoes" && (
              <p className="fms-units-line">
                Measuring in <strong>{units === "in" ? "inches" : "centimetres"}</strong> ·{" "}
                <button type="button" className="fms-link" onClick={() => chooseUnits(units === "in" ? "cm" : "in")}>
                  Use {units === "in" ? "centimetres" : "inches"}
                </button>
              </p>
            )}

            {kind === "tops" && (
              <>
                {units === "in" ? (
                  <div className={`fms-field${errors.height ? " has-error" : ""}`}>
                    <span className="fms-label" id="fms-height-label">
                      Height
                    </span>
                    <div className="fms-pair" role="group" aria-labelledby="fms-height-label">
                      <span className="fms-input">
                        <input aria-label="Feet" inputMode="numeric" value={form.ft || ""} onChange={(e) => set("ft", e.target.value.replace(/\D/g, ""))} placeholder="5" />
                        <span className="fms-input__suffix">ft</span>
                      </span>
                      <span className="fms-input">
                        <input aria-label="Inches" inputMode="numeric" value={form.inch || ""} onChange={(e) => set("inch", e.target.value.replace(/\D/g, ""))} placeholder="9" />
                        <span className="fms-input__suffix">in</span>
                      </span>
                    </div>
                    {errors.height && <p className="fms-error">{errors.height}</p>}
                  </div>
                ) : (
                  <Field id="fms-height" label="Height" suffix="cm" placeholder="175" value={form.height || ""} error={errors.height} onChange={(e) => set("height", e.target.value)} />
                )}
                <div className="fms-weight">
                  <Field id="fms-weight" label="Weight" suffix={weightUnit} placeholder={weightUnit === "lb" ? "165" : "75"} value={form.weight || ""} error={errors.weight} onChange={(e) => set("weight", e.target.value)} />
                  {units === "in" && (
                    <div className="fms-toggle" role="group" aria-label="Weight unit">
                      {["kg", "lb"].map((wu) => (
                        <button key={wu} type="button" aria-pressed={weightUnit === wu} onClick={() => switchWeightUnit(wu)}>
                          {wu}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {kind === "bottoms" && (
              <Field
                id="fms-waist-size"
                label="Waist size you usually wear"
                placeholder="32"
                inputMode="numeric"
                value={form.waistSize || ""}
                error={errors.waistSize}
                onChange={(e) => set("waistSize", e.target.value.replace(/\D/g, ""))}
              />
            )}

            {kind !== "shoes" && (
              <>
                <fieldset className="fms-fits">
                  <legend>How do you like it to fit?</legend>
                  <div className="fms-pills">
                    {FITS.map((x) => (
                      <label key={x.value} className={`fms-pill${form.fit === x.value ? " is-on" : ""}`}>
                        <input type="radio" name="fms-fit" value={x.value} checked={form.fit === x.value} onChange={() => set("fit", x.value)} />
                        {x.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="fms-check">
                  <input type="checkbox" checked={form.knowExact} onChange={(e) => set("knowExact", e.target.checked)} />
                  I know my exact {kind === "tops" ? "chest" : "waist"} measurement
                </label>
                {form.knowExact &&
                  (kind === "tops" ? (
                    <Field id="fms-chest" label="Chest, measured around" suffix={units} placeholder={units === "in" ? "39" : "99"} value={form.chest || ""} error={errors.chest} onChange={(e) => set("chest", e.target.value)} />
                  ) : (
                    <Field id="fms-waist" label="Waist, measured around" suffix={units} placeholder={units === "in" ? "32" : "81"} value={form.waist || ""} error={errors.waist} onChange={(e) => set("waist", e.target.value)} />
                  ))}
              </>
            )}

            {kind === "shoes" && (
              <div className={`fms-field${errors.size ? " has-error" : ""}`}>
                <label htmlFor="fms-shoe">Your usual shoe size</label>
                <div className="fms-pair">
                  <select aria-label="Size system" className="fms-select" value={form.system} onChange={(e) => set("system", e.target.value)}>
                    {SHOE_SYSTEMS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <span className="fms-input">
                    <input id="fms-shoe" inputMode="decimal" placeholder="8" value={form.size || ""} onChange={(e) => set("size", e.target.value)} aria-invalid={Boolean(errors.size)} />
                  </span>
                </div>
                {errors.size && <p className="fms-error">{errors.size}</p>}
                <p className="fms-note">Most shoe shops in Pakistan use UK sizes — our size buttons are EU.</p>
              </div>
            )}

            <button type="submit" className="fms-primary">
              Show my size
            </button>
            <p className="fms-note">Your answers stay on this device.</p>
          </form>
        )}

        {step === "result" && result && (
          <div className="fms-body">
            <div className="fms-result" aria-live="polite">
              {result.status === "noFit" ? (
                <>
                  <p className="fms-result__eyebrow">We can&apos;t recommend a size</p>
                  <p className="fms-result__reason">{reasonFor(result, units)}</p>
                  <button type="button" className="fms-primary" onClick={onShowChart}>
                    View size chart
                  </button>
                </>
              ) : result.status === "soldOut" ? (
                <>
                  <p className="fms-result__eyebrow">Your size</p>
                  <p className="fms-result__size">
                    {result.soldOut.size} <span className="fms-badge">Sold out</span>
                  </p>
                  <p className="fms-result__reason">{result.soldOut.size} is sold out in this colour.</p>
                  {result.alt ? (
                    <>
                      <p className="fms-result__reason">{result.alt.size} would also fit — a little {result.rows.indexOf(result.alt) > result.rows.indexOf(result.soldOut) ? "roomier" : "closer"}.</p>
                      <button type="button" className="fms-primary" onClick={() => pick(result.alt.size)}>
                        Select {result.alt.size}
                      </button>
                    </>
                  ) : (
                    <p className="fms-result__reason">Try another colour, or check back soon.</p>
                  )}
                </>
              ) : (
                <>
                  <p className="fms-result__eyebrow">{result.status === "between" ? "You're between sizes — we suggest" : "Recommended for you"}</p>
                  <p className="fms-result__size">{result.kind === "shoes" ? `EU ${result.pick.size}` : result.pick.size}</p>
                  <p className="fms-result__reason">{reasonFor(result, units)}</p>
                  <button type="button" className="fms-primary" onClick={() => pick(result.pick.size)}>
                    Select {result.pick.size}
                  </button>
                  {result.status === "between" && (
                    <button type="button" className="fms-secondary" onClick={() => pick(result.alt.size)}>
                      Select {result.alt.size} instead
                    </button>
                  )}
                </>
              )}
            </div>

            {result.kind !== "shoes" && (
              <details className="fms-how">
                <summary>How we worked this out</summary>
                <p>
                  Your {result.measure}: <strong>{f(result.body)}</strong>
                  {result.estimated && result.kind === "tops" && " — estimated from your height and weight, so treat it as a guide"}
                  {result.estimated && result.kind === "bottoms" && ` — from your usual size ${saved.waistSize}`}.
                </p>
                <table className="fms-table">
                  <thead>
                    <tr>
                      <th scope="col">Size</th>
                      <th scope="col">{result.measure === "chest" ? "Chest" : "Waist"}, around</th>
                      <th scope="col">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => (
                      <tr key={r.size} className={r.size === (result.soldOut || result.pick)?.size ? "is-pick" : ""}>
                        <td>{r.size}</td>
                        <td>{f(r.garment)}</td>
                        <td>{r.ease >= 0 ? `+${f(r.ease)}` : `−${f(-r.ease)}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}

            <div className="fms-links">
              <button type="button" className="fms-link" onClick={() => setStep("questions")}>
                Edit answers
              </button>
              <button type="button" className="fms-link" onClick={onShowChart}>
                View size chart
              </button>
              <button type="button" className="fms-link" onClick={forget}>
                Forget my measurements
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
