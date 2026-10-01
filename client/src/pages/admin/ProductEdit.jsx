import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { createAdminProduct, deleteAdminProduct, fetchAdminProduct, fetchProductMeta, updateAdminProduct } from "../../api/admin";
import { errorMessage } from "../../api/orders";
import { AdminPage } from "../../components/admin/AdminLayout";
import { Badge } from "../../components/admin/OrdersTable";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Toast, { useToast } from "../../components/admin/Toast";
import { rupees } from "../../components/admin/format";
import { sized } from "../../utils/format";
import "./ProductEdit.css";

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];

const EMPTY = {
  title: "",
  description: "",
  styleCode: "",
  productType: "",
  color: "",
  colorHex: "",
  price: "",
  compareAtPrice: "",
  variants: DEFAULT_SIZES.map((size) => ({ size, sku: "", available: true })),
  images: [],
  collections: [],
  status: "draft",
};

const toForm = (p) => ({
  title: p.title || "",
  description: p.description || "",
  styleCode: p.styleCode || "",
  productType: p.productType || "",
  color: p.color || "",
  colorHex: p.colorHex || "",
  price: p.price ?? "",
  compareAtPrice: p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice : "",
  variants: (p.variants || []).map((v) => ({ size: v.size, sku: v.sku || "", available: Boolean(v.available) })),
  images: p.images || [],
  collections: p.collections || [],
  status: p.status || "active",
});

// ---------- description preview (built as React elements, never innerHTML) ----------

const PREVIEW_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "h3", "h4"]);
// Dropped with their contents, matching what the server strips on save.
const DROP_TAGS = new Set(["script", "style", "iframe", "object", "embed", "noscript", "template"]);

function toReact(node, key) {
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeType !== 1) return null;
  const tag = node.tagName.toLowerCase();
  if (DROP_TAGS.has(tag)) return null;
  const children = [...node.childNodes].map((c, i) => toReact(c, i));
  if (!PREVIEW_TAGS.has(tag)) return <Fragment key={key}>{children}</Fragment>;
  const Tag = tag;
  return tag === "br" ? <br key={key} /> : <Tag key={key}>{children}</Tag>;
}

function DescriptionPreview({ html }) {
  const content = useMemo(() => {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    return [...doc.body.firstChild.childNodes].map((n, i) => toReact(n, i));
  }, [html]);
  return <div className="pe-preview">{html.trim() ? content : <p className="adm-muted">Nothing to preview yet.</p>}</div>;
}

// ---------- small form pieces ----------

function Field({ id, label, error, hint, children }) {
  return (
    <div className={`pe-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="pe-error" id={`${id}-error`}>
          {error}
        </p>
      ) : (
        hint && <p className="pe-hint">{hint}</p>
      )}
    </div>
  );
}

function ImagesEditor({ images, onChange, error }) {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [broken, setBroken] = useState({});

  const add = () => {
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "https:") throw new Error();
      if (images.includes(u.href)) return setUrlError("That image is already added");
      if (images.length >= 12) return setUrlError("Up to 12 images");
      onChange([...images, u.href]);
      setUrl("");
      setUrlError("");
    } catch {
      setUrlError("Paste a full image link starting with https://");
    }
  };

  const move = (i, dir) => {
    const next = [...images];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  return (
    <div>
      {images.length > 0 ? (
        <ul className="pe-images">
          {images.map((src, i) => (
            <li key={src} className={i === 0 ? "is-main" : ""}>
              <img src={sized(src, 300)} alt={`Image ${i + 1}`} onError={() => setBroken((b) => ({ ...b, [src]: true }))} onLoad={() => setBroken((b) => ({ ...b, [src]: false }))} />
              {broken[src] && <span className="pe-images__broken">Can&rsquo;t load this image</span>}
              {i === 0 && <span className="pe-images__main">Main</span>}
              <div className="pe-images__tools">
                <button type="button" aria-label={`Move image ${i + 1} left`} disabled={i === 0} onClick={() => move(i, -1)}>
                  &larr;
                </button>
                <button type="button" aria-label={`Move image ${i + 1} right`} disabled={i === images.length - 1} onClick={() => move(i, 1)}>
                  &rarr;
                </button>
                <button type="button" aria-label={`Remove image ${i + 1}`} onClick={() => onChange(images.filter((x) => x !== src))}>
                  &times;
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pe-empty">No images yet. The first image is the one shoppers see in listings.</p>
      )}
      <div className="pe-inline">
        <label htmlFor="ImageUrl" className="visually-hidden">
          Image URL
        </label>
        <input
          id="ImageUrl"
          className="pe-input"
          type="url"
          placeholder="https://…/image.jpg"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setUrlError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="adm-btn" onClick={add} disabled={!url.trim()}>
          Add image
        </button>
      </div>
      {(urlError || error) && <p className="pe-error">{urlError || error}</p>}
    </div>
  );
}

function SizesEditor({ variants, onChange, error }) {
  const set = (i, patch) => onChange(variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const inStock = variants.filter((v) => v.available).length;

  return (
    <div>
      <div className="pe-sizes__bar">
        <span className="adm-muted">
          {inStock} of {variants.length} sizes in stock
        </span>
        <span className="pe-sizes__bulk">
          <button type="button" className="adm-btn adm-btn--plain" onClick={() => onChange(variants.map((v) => ({ ...v, available: true })))}>
            All in stock
          </button>
          <button type="button" className="adm-btn adm-btn--plain" onClick={() => onChange(variants.map((v) => ({ ...v, available: false })))}>
            All sold out
          </button>
        </span>
      </div>
      <table className="pe-sizes">
        <thead>
          <tr>
            <th scope="col">Size</th>
            <th scope="col">SKU</th>
            <th scope="col">In stock</th>
            <th scope="col">
              <span className="visually-hidden">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v, i) => (
            <tr key={i}>
              <td>
                <input className="pe-input pe-input--size" aria-label={`Size ${i + 1}`} value={v.size} maxLength={12} onChange={(e) => set(i, { size: e.target.value.toUpperCase() })} />
              </td>
              <td>
                <input className="pe-input" aria-label={`SKU for size ${v.size || i + 1}`} value={v.sku} maxLength={40} placeholder="Optional" onChange={(e) => set(i, { sku: e.target.value.toUpperCase() })} />
              </td>
              <td>
                <label className="pe-switch">
                  <input type="checkbox" role="switch" checked={v.available} onChange={(e) => set(i, { available: e.target.checked })} aria-label={`Size ${v.size || i + 1} in stock`} />
                  <span aria-hidden="true" />
                  <em>{v.available ? "In stock" : "Sold out"}</em>
                </label>
              </td>
              <td>
                <button type="button" className="pe-remove" aria-label={`Remove size ${v.size || i + 1}`} disabled={variants.length === 1} onClick={() => onChange(variants.filter((_, j) => j !== i))}>
                  &times;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="adm-btn adm-btn--plain pe-add-size" onClick={() => onChange([...variants, { size: "", sku: "", available: true }])} disabled={variants.length >= 20}>
        + Add size
      </button>
      {error && <p className="pe-error">{error}</p>}
    </div>
  );
}

function CollectionsPicker({ all, selected, onChange }) {
  const [filter, setFilter] = useState("");
  const groups = [...new Set(all.map((c) => c.group))];
  const f = filter.trim().toLowerCase();
  const toggle = (h) => onChange(selected.includes(h) ? selected.filter((x) => x !== h) : [...selected, h]);

  return (
    <div>
      <input className="pe-input" type="search" placeholder="Filter collections" aria-label="Filter collections" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="pe-collections">
        {groups.map((g) => {
          const items = all.filter((c) => c.group === g && (!f || `${c.title} ${g}`.toLowerCase().includes(f)));
          if (!items.length) return null;
          return (
            <fieldset key={g}>
              <legend>{g}</legend>
              {items.map((c) => (
                <label key={c.handle} className="pe-check">
                  <input type="checkbox" checked={selected.includes(c.handle)} onChange={() => toggle(c.handle)} />
                  <span>{c.title}</span>
                </label>
              ))}
            </fieldset>
          );
        })}
      </div>
      <p className="pe-hint">{selected.length ? `In ${selected.length} collection${selected.length === 1 ? "" : "s"}` : "Not in any collection — shoppers can still find it through search."}</p>
    </div>
  );
}

// ---------- page ----------

export default function ProductEdit() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const location = useLocation();
  const backSearch = location.state?.back || "";

  const [meta, setMeta] = useState(null);
  const [product, setProduct] = useState(null); // last saved version
  const [form, setForm] = useState(isNew ? EMPTY : null);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);
  const [descMode, setDescMode] = useState("write");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [toast, showToast] = useToast();
  const topRef = useRef(null);

  useEffect(() => {
    fetchProductMeta().then(setMeta).catch(() => setMeta({ productTypes: [], colors: [], collections: [] }));
  }, []);

  useEffect(() => {
    setErrors({});
    setBanner("");
    if (isNew) {
      setProduct(null);
      setForm(EMPTY);
      return;
    }
    setForm(null);
    fetchAdminProduct(id)
      .then((p) => {
        setProduct(p);
        setForm(toForm(p));
      })
      .catch((err) => setLoadError(errorMessage(err, "Couldn't load this product.")));
  }, [id, isNew]);

  const baseline = useMemo(() => JSON.stringify(product ? toForm(product) : EMPTY), [product]);
  const dirty = form && JSON.stringify(form) !== baseline;

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const save = async () => {
    setSaving(true);
    setBanner("");
    const body = { ...form, price: Number(form.price), compareAtPrice: form.compareAtPrice === "" ? null : Number(form.compareAtPrice) };
    try {
      const saved = isNew ? await createAdminProduct(body) : await updateAdminProduct(id, body);
      setErrors({});
      setProduct(saved);
      setForm(toForm(saved));
      if (isNew) {
        navigate(`/admin/products/${saved._id}`, { replace: true, state: { back: backSearch } });
      }
      showToast(isNew ? "Product created" : "Product saved");
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      setErrors(fieldErrors || {});
      setBanner(errorMessage(err, "Couldn't save the product."));
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setForm(product ? toForm(product) : EMPTY);
    setErrors({});
    setBanner("");
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteAdminProduct(id);
      navigate(`/admin/products${backSearch}`, { replace: true, state: { toast: `Deleted “${product.title}”` } });
    } catch (err) {
      showToast(errorMessage(err, "Couldn't delete the product."), { error: true });
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const back = (
    <Link to={`/admin/products${backSearch}`} className="adm-btn od-icon-btn pe-back" aria-label="Back to products">
      <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
        <path d="M12 5 7 10l5 5" />
      </svg>
    </Link>
  );

  if (loadError) {
    return (
      <AdminPage title="Product" back={back}>
        <p className="adm-error">{loadError}</p>
      </AdminPage>
    );
  }

  if (!form || !meta) {
    return (
      <AdminPage title={isNew ? "Add product" : "Product"} back={back}>
        <div className="pe-grid" aria-busy="true">
          <div className="adm-card pe-card">
            <div className="adm-skeleton" style={{ height: 220 }} />
          </div>
          <div className="adm-card pe-card">
            <div className="adm-skeleton" style={{ height: 140 }} />
          </div>
        </div>
      </AdminPage>
    );
  }

  const price = Number(form.price);
  const compare = Number(form.compareAtPrice);
  const onSale = form.compareAtPrice !== "" && compare > price && price > 0;
  const off = onSale ? Math.round((1 - price / compare) * 100) : 0;
  const live = product && product.status !== "draft";

  return (
    <AdminPage
      title={isNew ? "Add product" : product.title}
      back={back}
      heading={
        isNew ? (
          "Add product"
        ) : (
          <>
            <span className="pe-title">{product.title}</span>
            <Badge label={product.status === "draft" ? "Draft" : "Active"} tone={product.status === "draft" ? "info" : "success"} />
          </>
        )
      }
      subtitle={isNew ? "New products start as a draft, hidden from the store until you set them Active." : `${product.color} · ${product.styleCode}`}
      actions={
        live && (
          <a href={`/products/${product.handle}`} target="_blank" rel="noreferrer" className="adm-btn">
            View on store
          </a>
        )
      }
    >
      <div ref={topRef} />

      {dirty && (
        <div className="pe-savebar" role="region" aria-label="Unsaved changes">
          <span>
            <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
              <path d="M10 6v5M10 14h.01M10 2.5 18 17H2z" />
            </svg>
            Unsaved changes
          </span>
          <span className="pe-savebar__btns">
            <button type="button" className="adm-btn" onClick={discard} disabled={saving}>
              Discard
            </button>
            <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </span>
        </div>
      )}

      {banner && (
        <div className="adm-error pe-banner" role="alert">
          {banner}
        </div>
      )}

      <div className="pe-grid">
        <div className="pe-main">
          <section className="adm-card pe-card">
            <Field id="Title" label="Title" error={errors.title}>
              <input id="Title" className="pe-input" value={form.title} maxLength={120} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Cotton Striped Shirt" />
            </Field>
            <div className="pe-field">
              <div className="pe-label-row">
                <label htmlFor="Description">Description</label>
                <div className="adm-segmented pe-seg" role="radiogroup" aria-label="Description view">
                  {["write", "preview"].map((m) => (
                    <button key={m} type="button" role="radio" aria-checked={descMode === m} onClick={() => setDescMode(m)}>
                      {m === "write" ? "Write" : "Preview"}
                    </button>
                  ))}
                </div>
              </div>
              {descMode === "write" ? (
                <textarea id="Description" className="pe-input pe-textarea" rows={8} value={form.description} maxLength={8000} onChange={(e) => set("description", e.target.value)} />
              ) : (
                <DescriptionPreview html={form.description} />
              )}
              <p className="pe-hint">
                Basic formatting: &lt;p&gt;, &lt;b&gt;, &lt;br&gt;, &lt;ul&gt;&lt;li&gt;. Anything else is removed when you save.
              </p>
            </div>
          </section>

          <section className="adm-card pe-card" aria-labelledby="MediaTitle">
            <h2 id="MediaTitle" className="adm-card__title pe-card__title">
              Media
            </h2>
            <ImagesEditor images={form.images} onChange={(v) => set("images", v)} error={errors.images} />
          </section>

          <section className="adm-card pe-card" aria-labelledby="PricingTitle">
            <h2 id="PricingTitle" className="adm-card__title pe-card__title">
              Pricing
            </h2>
            <div className="pe-row">
              <Field id="Price" label="Price" error={errors.price}>
                <span className="pe-money">
                  <span>Rs</span>
                  <input id="Price" className="pe-input" inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
                </span>
              </Field>
              <Field id="Compare" label="Compare-at price" error={errors.compareAtPrice} hint="The original price, shown crossed out.">
                <span className="pe-money">
                  <span>Rs</span>
                  <input id="Compare" className="pe-input" inputMode="numeric" value={form.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value.replace(/[^\d]/g, ""))} placeholder="Optional" />
                </span>
              </Field>
            </div>
            <p className="pe-pricing-preview">
              {price > 0 ? (
                <>
                  Shoppers see <strong>{rupees(price)}</strong>
                  {onSale && (
                    <>
                      {" "}
                      <s>{rupees(compare)}</s> <span className="prod-off">{off}% off</span>
                    </>
                  )}
                </>
              ) : (
                <span className="adm-muted">Enter a price to see how it appears in the store.</span>
              )}
            </p>
          </section>

          <section className="adm-card pe-card" aria-labelledby="SizesTitle">
            <h2 id="SizesTitle" className="adm-card__title pe-card__title">
              Sizes &amp; availability
            </h2>
            <SizesEditor variants={form.variants} onChange={(v) => set("variants", v)} error={errors.variants} />
          </section>
        </div>

        <aside className="pe-side">
          <section className="adm-card pe-card" aria-labelledby="StatusTitle">
            <h2 id="StatusTitle" className="adm-card__title pe-card__title">
              Status
            </h2>
            <label htmlFor="Status" className="visually-hidden">
              Status
            </label>
            <select id="Status" className="adm-select pe-select" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            <p className="pe-hint">{form.status === "draft" ? "Hidden from the store. Shoppers can't find or buy it." : "Visible in the store and collections."}</p>
          </section>

          <section className="adm-card pe-card" aria-labelledby="OrgTitle">
            <h2 id="OrgTitle" className="adm-card__title pe-card__title">
              Product organization
            </h2>
            <Field id="Type" label="Type">
              <input id="Type" className="pe-input" list="TypeOptions" value={form.productType} maxLength={40} onChange={(e) => set("productType", e.target.value.toUpperCase())} placeholder="e.g. SHIRT" />
              <datalist id="TypeOptions">
                {meta.productTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
            <Field id="Style" label="Style code" error={errors.styleCode} hint="Colourways of the same garment share a style code.">
              <input id="Style" className="pe-input" value={form.styleCode} maxLength={40} onChange={(e) => set("styleCode", e.target.value.toUpperCase())} placeholder="e.g. MAS26TP057" />
            </Field>
            <Field id="Color" label="Colour" error={errors.color}>
              <span className="pe-color">
                <input
                  type="color"
                  aria-label="Swatch colour"
                  value={/^#[0-9a-f]{6}$/i.test(form.colorHex) ? form.colorHex : "#cccccc"}
                  onChange={(e) => set("colorHex", e.target.value)}
                />
                <input id="Color" className="pe-input" list="ColorOptions" value={form.color} maxLength={30} onChange={(e) => set("color", e.target.value.toUpperCase())} placeholder="e.g. NAVY" />
              </span>
              <datalist id="ColorOptions">
                {meta.colors.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </section>

          <section className="adm-card pe-card" aria-labelledby="ColTitle">
            <h2 id="ColTitle" className="adm-card__title pe-card__title">
              Collections
            </h2>
            <CollectionsPicker all={meta.collections} selected={form.collections} onChange={(v) => set("collections", v)} />
          </section>

          {!isNew && product.colourways.length > 0 && (
            <section className="adm-card pe-card" aria-labelledby="ColourwaysTitle">
              <h2 id="ColourwaysTitle" className="adm-card__title pe-card__title">
                Other colours
              </h2>
              <ul className="pe-colourways">
                {product.colourways.map((c) => (
                  <li key={c._id}>
                    <Link to={`/admin/products/${c._id}`} state={{ back: backSearch }}>
                      <span className="pe-colourways__thumb">{c.image && <img src={sized(c.image, 80)} alt="" />}</span>
                      <span>{c.color}</span>
                      {c.status === "draft" && <Badge label="Draft" tone="info" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <div className="pe-footer">
        {!isNew && (
          <button type="button" className="adm-btn pe-delete" onClick={() => setConfirmDelete(true)}>
            Delete product
          </button>
        )}
        <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={saving || (!dirty && !isNew)}>
          {saving ? "Saving…" : isNew ? "Save product" : "Save"}
        </button>
      </div>

      {!isNew && (
        <ConfirmDialog
          open={confirmDelete}
          title={`Delete “${product.title}” (${product.color})?`}
          confirmLabel="Delete product"
          cancelLabel="Keep product"
          busy={deleting}
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        >
          <p>This can&rsquo;t be undone. Past orders keep their own copy of the item, so order history isn&rsquo;t affected.</p>
          <p>
            To hide it for now instead, set the status to <strong>Draft</strong>.
          </p>
        </ConfirmDialog>
      )}
      <Toast {...toast} />
    </AdminPage>
  );
}
