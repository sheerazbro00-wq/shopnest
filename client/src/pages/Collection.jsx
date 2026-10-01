import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchCollections, fetchFacets } from "../api/products";
import useFilters from "../components/collection/useFilters";
import useProductFeed from "../components/collection/useProductFeed";
import TopFilterBar from "../components/collection/TopFilterBar";
import FilterDrawer from "../components/collection/FilterDrawer";
import ProductCard from "../components/product/ProductCard";
import { FilterIcon } from "../components/Icons";
import "./Collection.css";

const PAGE_SIZE = 40;

const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "title-ascending", label: "Alphabetically, A-Z" },
  { value: "title-descending", label: "Alphabetically, Z-A" },
  { value: "price-ascending", label: "Price, low to high" },
  { value: "price-descending", label: "Price, high to low" },
  { value: "created-ascending", label: "Date, old to new" },
  { value: "created-descending", label: "Date, new to old" },
];

export default function Collection() {
  const { handle } = useParams();
  const { filters, sortBy, query, toggle, setValue, setValues, clearAll, activeCount } = useFilters();
  const [collection, setCollection] = useState(undefined);
  const [facets, setFacets] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const feedParams = useMemo(() => ({ collection: handle, ...query }), [handle, query]);
  const { products, loading, sentinelRef } = useProductFeed(feedParams, { pageSize: PAGE_SIZE });

  useEffect(() => {
    fetchCollections()
      .then((list) => setCollection(list.find((c) => c.handle === handle) || null))
      .catch(() => setCollection(null));
    setFacets(null);
    fetchFacets({ collection: handle }).then(setFacets).catch(() => setFacets(null));
  }, [handle]);

  useEffect(() => {
    if (collection) document.title = `${collection.title} – ShopNest`;
  }, [collection]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  if (collection === null) {
    return (
      <div className="page-width collection-empty">
        <h1 className="collection-empty__title">Collection not found</h1>
        <Link to="/" className="btn">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="collection-page">
      <h1 className="visually-hidden">{collection?.title || ""}</h1>

      <TopFilterBar facets={facets} filters={filters} toggle={toggle} setValue={setValue} />

      <div className="page-width">
        <div className="collection-toolbar">
          <button type="button" className="collection-toolbar__filter" onClick={() => setDrawerOpen(true)}>
            <FilterIcon />
            Filter{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
          <label className="visually-hidden" htmlFor="SortBy">
            Sort by
          </label>
          <select id="SortBy" className="collection-toolbar__sort" value={sortBy} onChange={(e) => setValue("sort_by", e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {products.length > 0 && (
          <div className="collection-grid">
            {products.map((p) => (
              <ProductCard key={p.handle} product={p} sizesAttr="(max-width: 768px) 50vw, 25vw" />
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="collection-empty">
            <p>Sorry, there are no products matching your filters.</p>
            {activeCount > 0 && (
              <button type="button" className="btn" onClick={clearAll}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        {loading && <p className="collection-loading">Loading...</p>}
        <div ref={sentinelRef} aria-hidden="true" />
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        facets={facets}
        filters={filters}
        toggle={toggle}
        setValues={setValues}
        clearAll={clearAll}
        activeCount={activeCount}
      />
    </div>
  );
}
