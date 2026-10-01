import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageLayout from "../../components/page/PageLayout";
import Collapsible from "../../components/common/Collapsible";
import { faqs } from "../../data/faqs";
import "./Faqs.css";

// "What are the delivery charges?" -> "what-are-the-delivery-charges"
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Plain text of a JSX answer, so the filter can search inside answers too.
function textOf(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  return textOf(node.props?.children);
}

const ITEMS = faqs.map((f) => ({ ...f, id: slugify(f.q), text: `${f.q} ${textOf(f.a)}`.toLowerCase() }));

export default function Faqs() {
  const { hash } = useLocation();
  const [open, setOpen] = useState(() => new Set());
  const [query, setQuery] = useState("");

  // Deep link: /pages/faqs#what-are-the-delivery-charges opens and scrolls to it.
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (!id || !ITEMS.some((f) => f.id === id)) return;
    setQuery(""); // a leftover filter could hide the linked question
    setOpen(new Set([id]));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "center" }));
  }, [hash]);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = useMemo(() => ITEMS.filter((f) => words.every((w) => f.text.includes(w))), [words.join(" ")]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <PageLayout title="FAQ's" compact>
      <div className="faq-search">
        <label htmlFor="FaqSearch" className="visually-hidden">
          Search FAQs
        </label>
        <svg viewBox="0 0 64 64" aria-hidden="true" className="faq-search__icon">
          <path d="M47.16 28.58A18.58 18.58 0 1 1 28.58 10a18.58 18.58 0 0 1 18.58 18.58ZM54 54 41.94 42" />
        </svg>
        <input
          id="FaqSearch"
          type="search"
          className="faq-search__input"
          placeholder="Search questions, e.g. delivery, exchange"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {query && (
        <p className="faq-count" aria-live="polite">
          {visible.length} {visible.length === 1 ? "question" : "questions"} found
        </p>
      )}

      <div className="faq-list">
        {visible.map((f) => (
          <Collapsible key={f.id} id={f.id} title={f.q} open={open.has(f.id)} onToggle={() => toggle(f.id)}>
            {f.a}
          </Collapsible>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="faq-empty">
          <p>No questions match &ldquo;{query}&rdquo;.</p>
          <p>
            Can&rsquo;t find your answer? <Link to="/pages/contact">Contact us</Link> and we&rsquo;ll help.
          </p>
        </div>
      )}
    </PageLayout>
  );
}
