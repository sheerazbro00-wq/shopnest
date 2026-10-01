import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchSuggestions } from "../../api/products";
import { sized } from "../../utils/format";
import { CloseIcon, SearchIcon } from "../Icons";
import "./Search.css";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 200;
const cache = new Map(); // query -> suggestions, for instant results when retyping

export const searchUrl = (q) => `/search?q=${encodeURIComponent(q.trim())}`;

// Bold the parts of `text` that match the typed words.
function Highlight({ text, query }) {
  const words = query.trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return text;
  const parts = text.split(new RegExp(`(${words.join("|")})`, "gi"));
  return parts.map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}

// Search box with Shopify-style predictive results (products + collections).
// context "header": lives in the header overlay, shows a close button.
// context "page": the /search page's box; results drop down under it.
export default function PredictiveSearch({ context = "page", initialQuery = "", autoFocus = false, onClose, onNavigate }) {
  const navigate = useNavigate();
  const id = useId();
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(null); // { q, products, collections }
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const trimmed = query.trim();
  const ready = trimmed.length >= MIN_CHARS;

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  // Debounced fetch; the AbortController cancels the previous request so an
  // older, slower response can never overwrite a newer one.
  useEffect(() => {
    setActive(-1);
    if (!ready) {
      setResults(null);
      setLoading(false);
      return;
    }
    const key = trimmed.toLowerCase();
    if (cache.has(key)) {
      setResults({ q: trimmed, ...cache.get(key) });
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      fetchSuggestions(trimmed, controller.signal)
        .then((data) => {
          cache.set(key, data);
          setResults({ q: trimmed, ...data });
          setLoading(false);
        })
        .catch((err) => {
          if (err.name !== "CanceledError") setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, ready]);

  // Page context: close the dropdown on outside click.
  useEffect(() => {
    if (context !== "page" || !open) return;
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [context, open]);

  // Keyboard-navigable options in visual order: products, collections, "show all".
  const options = useMemo(() => {
    if (!results) return [];
    return [
      ...results.products.map((p) => ({ key: "p-" + p.handle, to: `/products/${p.handle}` })),
      ...results.collections.map((c) => ({ key: "c-" + c.handle, to: `/collections/${c.handle}` })),
      { key: "all", to: searchUrl(results.q) },
    ];
  }, [results]);

  const showPanel = ready && open && results !== null;
  const empty = results && !results.products.length && !results.collections.length;
  const activeKey = options[active]?.key;
  const optionId = (key) => `${id}-${key}`;
  const indexOf = (key) => options.findIndex((o) => o.key === key);

  // After choosing a result: close without moving focus back to the header icon.
  const finish = () => {
    setOpen(false);
    inputRef.current?.blur();
    onNavigate?.();
  };

  const go = (to) => {
    navigate(to);
    finish();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (active >= 0 && options[active]) return go(options[active].to);
    go(trimmed ? searchUrl(trimmed) : "/search");
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      if (context === "page" && open) {
        setOpen(false);
        e.stopPropagation();
      } else onClose?.();
      return;
    }
    if (!showPanel || !options.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      // Cycle through -1 (the input itself), 0 … n-1 (the options).
      const n = options.length + 1;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => ((i + 1 + step + n) % n) - 1);
    }
  };

  const optionProps = (key) => ({
    id: optionId(key),
    role: "option",
    "aria-selected": activeKey === key,
    className: activeKey === key ? "is-active" : undefined,
    onMouseEnter: () => setActive(indexOf(key)),
  });

  return (
    <div ref={rootRef} className={`psearch psearch--${context}${showPanel ? " is-open" : ""}`}>
      <form action="/search" method="get" role="search" className="psearch__form" onSubmit={onSubmit}>
        <label htmlFor={`${id}-input`} className="visually-hidden">
          Search
        </label>
        <div className="psearch__field">
          <input
            ref={inputRef}
            id={`${id}-input`}
            className="psearch__input"
            type="search"
            name="q"
            placeholder="Search"
            value={query}
            maxLength={100}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={`${id}-results`}
            aria-autocomplete="list"
            aria-activedescendant={activeKey ? optionId(activeKey) : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          {loading && <span className="psearch__spinner" aria-hidden="true" />}
          <button type="submit" className="psearch__submit" aria-label="Search">
            <SearchIcon />
          </button>
        </div>
        {context === "header" && (
          <button type="button" className="psearch__close" aria-label="Close search" onClick={onClose}>
            <CloseIcon />
          </button>
        )}
      </form>

      {showPanel && (
        <div id={`${id}-results`} className={`psearch__panel${loading ? " is-loading" : ""}`} role="listbox" aria-label="Search suggestions">
          {empty ? (
            <p className="psearch__empty">
              No suggestions for &ldquo;{results.q}&rdquo;
            </p>
          ) : (
            <div className="psearch__groups">
              {results.products.length > 0 && (
                <div className="psearch__group psearch__group--products" role="group" aria-labelledby={`${id}-ph`}>
                  <h3 id={`${id}-ph`} className="psearch__heading">
                    Products
                  </h3>
                  <ul>
                    {results.products.map((p) => (
                      <li key={p.handle} {...optionProps("p-" + p.handle)}>
                        <Link to={`/products/${p.handle}`} tabIndex={-1} onClick={finish} className="psearch__product">
                          <span className="psearch__thumb">
                            {p.image && <img src={sized(p.image, 160)} alt="" />}
                          </span>
                          <span className="psearch__info">
                            <span className="psearch__title">
                              <Highlight text={p.title} query={results.q} />
                            </span>
                            {p.color && <span className="psearch__meta">{p.color}</span>}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {results.collections.length > 0 && (
                <div className="psearch__group psearch__group--collections" role="group" aria-labelledby={`${id}-ch`}>
                  <h3 id={`${id}-ch`} className="psearch__heading">
                    Collections
                  </h3>
                  <ul>
                    {results.collections.map((c) => (
                      <li key={c.handle} {...optionProps("c-" + c.handle)}>
                        <Link to={`/collections/${c.handle}`} tabIndex={-1} onClick={finish} className="psearch__collection">
                          <span>
                            <Highlight text={c.title.toUpperCase()} query={results.q} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div {...optionProps("all")} className={`psearch__all${activeKey === "all" ? " is-active" : ""}`}>
            <Link to={searchUrl(results.q)} tabIndex={-1} onClick={finish}>
              {empty ? "Search for" : "Show all results for"} &ldquo;{results.q}&rdquo; <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
