import { useEffect, useState } from "react";
import { ChevronDown, CloseIcon } from "../Icons";
import PriceRange from "./PriceRange";
import "./FilterDrawer.css";

function Group({ title, open, onToggle, children }) {
  return (
    <div className={`filter-group${open ? " is-open" : ""}`}>
      <button type="button" className="filter-group__trigger" aria-expanded={open} onClick={onToggle}>
        {title}
        <ChevronDown className="filter-group__chevron" />
      </button>
      {open && <div className="filter-group__content">{children}</div>}
    </div>
  );
}

function CheckList({ items, selected, onToggle }) {
  return (
    <ul className="filter-list">
      {items.map((item) => (
        <li key={item.value}>
          <label className="filter-check">
            <input type="checkbox" checked={selected.includes(String(item.value))} onChange={() => onToggle(item.value)} />
            <span className="filter-check__box" aria-hidden="true" />
            <span>
              {item.label ?? item.value} ({item.count})
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export default function FilterDrawer({ open, onClose, facets, filters, toggle, setValues, clearAll, activeCount }) {
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // A group starts expanded when it has an active filter, until the user toggles it.
  const active = {
    size: filters.size.length > 0,
    discount: filters.discount.length > 0,
    gender: false,
    availability: filters.availability.length > 0,
    type: filters.type.length > 0,
    price: Boolean(filters.price_min || filters.price_max),
    color: filters.color.length > 0,
  };
  const isOpen = (key) => openGroups[key] ?? active[key];
  const flip = (key) => setOpenGroups((g) => ({ ...g, [key]: !(g[key] ?? active[key]) }));

  return (
    <div className={`filter-drawer-wrap${open ? " is-open" : ""}`} aria-hidden={!open}>
      <div className="filter-drawer-overlay" onClick={onClose} />
      <aside className="filter-drawer" role="dialog" aria-label="Filter">
        <div className="filter-drawer__header">
          <h2 className="filter-drawer__title">Filter</h2>
          <button type="button" className="filter-drawer__close" aria-label="Close filters" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {facets && (
          <div className="filter-drawer__body">
            <Group title="Size" open={isOpen("size")} onToggle={() => flip("size")}>
              <CheckList items={facets.sizes} selected={filters.size} onToggle={(v) => toggle("size", v)} />
            </Group>

            <Group title="Discount" open={isOpen("discount")} onToggle={() => flip("discount")}>
              <CheckList
                items={facets.discounts.map((d) => ({ ...d, label: `${d.value}%` }))}
                selected={filters.discount}
                onToggle={(v) => toggle("discount", v)}
              />
            </Group>

            <Group title="Gender" open={isOpen("gender")} onToggle={() => flip("gender")}>
              <ul className="filter-list">
                <li className="filter-check filter-check--static">MAN ({facets.total})</li>
              </ul>
            </Group>

            <Group title="Product availability" open={isOpen("availability")} onToggle={() => flip("availability")}>
              <CheckList
                items={[
                  { value: "in", label: "In stock", count: facets.availability.in },
                  { value: "out", label: "Out of stock", count: facets.availability.out },
                ].filter((a) => a.count > 0)}
                selected={filters.availability}
                onToggle={(v) => toggle("availability", v)}
              />
            </Group>

            <Group title="Product type" open={isOpen("type")} onToggle={() => flip("type")}>
              <CheckList items={facets.types} selected={filters.type} onToggle={(v) => toggle("type", v)} />
            </Group>

            <Group title="Price" open={isOpen("price")} onToggle={() => flip("price")}>
              <PriceRange
                min={0}
                max={facets.price.max}
                valueMin={filters.price_min}
                valueMax={filters.price_max}
                onCommit={(lo, hi) => setValues({ price_min: lo, price_max: hi })}
              />
            </Group>

            <Group title="Color" open={isOpen("color")} onToggle={() => flip("color")}>
              <CheckList items={facets.colors} selected={filters.color} onToggle={(v) => toggle("color", v)} />
            </Group>

            {activeCount > 0 && (
              <button type="button" className="filter-drawer__clear" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
