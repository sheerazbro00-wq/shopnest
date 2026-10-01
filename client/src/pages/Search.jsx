import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchFacets } from "../api/products";
import useFilters from "../components/collection/useFilters";
import useProductFeed from "../components/collection/useProductFeed";
import FilterDrawer from "../components/collection/FilterDrawer";
import ProductCard from "../components/product/ProductCard";
import PredictiveSearch, { searchUrl } from "../components/search/PredictiveSearch";
import { FilterIcon } from "../components/Icons";
import "./Collection.css";
import "./Search.css";

const PAGE_SIZE = 40;

const SORT_OPTIONS = [
  { value: "", label: "Relevance" },
  { value: "price-ascending", label: "Price, low to high" },
  { value: "price-descending", label: "Price, high to low" },
];

const POPULAR = ["Shirts", "T-Shirts", "Polo", "Jeans", "Shorts", "Loafers", "Sneakers", "Belts"];

function PopularSearches() {
  return (
    <div className="search-popular">
      <p className="search-popular__label">Popular searches</p>
      <ul>
        {POPULAR.map((term) => (
          <li key={term}>
            <Link to={searchUrl(term)}>{term}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Search() {
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim().slice(0, 100);
  const { filters, sortBy, query, toggle, setValue, setValues, clearAll, activeCount } = useFilters();
  const [facets, setFacets] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const feedParams = useMemo(() => ({ q, ...query }), [q, query]);
  const { products, total, loading, sentinelRef } = useProductFeed(feedParams, { pageSize: PAGE_SIZE, enabled: Boolean(q) });

  useEffect(() => {
    setFacets(null);
    if (q) fetchFacets({ q }).then(setFacets).catch(() => setFacets(null));
  }, [q]);

  useEffect(() => {
    if (!q) document.title = "Search – ShopNest";
    else if (!loading) document.title = `Search: ${total} result${total === 1 ? "" : "s"} found for "${q}" – ShopNest`;
  }, [q, total, loading]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const noMatches = q && !loading && products.length === 0;
  // No results even without filters -> the query itself found nothing.
  const nothingForQuery = noMatches && activeCount === 0;

  return (
    <div className="search-page">
      <div className="page-width">
        <header className="search-page__header">
          <h1 className="search-page__title">Search</h1>
          <PredictiveSearch key={q} context="page" initialQuery={q} autoFocus={!q} />
        </header>

        {!q && <PopularSearches />}

        {q && (
          <>
            <hr className="search-page__rule" />

            {!nothingForQuery && (
              <>
                <p className="search-page__count" aria-live="polite">
                  {loading && !products.length ? (
                    "Searching…"
                  ) : (
                    <>
                      {total} result{total === 1 ? "" : "s"} for <strong>&ldquo;{q}&rdquo;</strong>
                    </>
                  )}
                </p>
                <div className="collection-toolbar search-page__toolbar">
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
              </>
            )}

            {products.length > 0 && (
              <div className="collection-grid">
                {products.map((p) => (
                  <ProductCard key={p.handle} product={p} showSaleBadge sizesAttr="(max-width: 768px) 50vw, 25vw" />
                ))}
              </div>
            )}

            {nothingForQuery && (
              <div className="search-empty">
                <h2 className="search-empty__title">No results found</h2>
                <p>
                  We couldn&rsquo;t find anything for <strong>&ldquo;{q}&rdquo;</strong>. Check the spelling or try a more general word.
                </p>
                <PopularSearches />
              </div>
            )}

            {noMatches && activeCount > 0 && (
              <div className="collection-empty">
                <p>Sorry, there are no products matching your filters.</p>
                <button type="button" className="btn" onClick={clearAll}>
                  Clear all filters
                </button>
              </div>
            )}

            {loading && products.length > 0 && <p className="collection-loading">Loading...</p>}
            <div ref={sentinelRef} aria-hidden="true" />
          </>
        )}
      </div>

      {q && (
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
      )}
    </div>
  );
}
