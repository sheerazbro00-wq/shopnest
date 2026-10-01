import ProductCard from "./ProductCard";
import "./ProductRow.css";

// Titled row of product cards: 4-up grid on desktop, swipeable on mobile.
// `products === null` renders placeholders while loading.
export default function ProductRow({ title, products, count = 4, showSaleBadge = false, className = "" }) {
  if (products && !products.length) return null;

  return (
    <section className={`product-row ${className}`}>
      <div className="page-width">
        <h2 className="product-row__title">{title}</h2>
      </div>
      <div className="product-row__scroller">
        <div className="product-row__grid" style={{ "--row-columns": count }}>
          {products
            ? products.map((p) => (
                <ProductCard
                  key={p.handle}
                  product={p}
                  showSaleBadge={showSaleBadge}
                  sizesAttr={`(max-width: 768px) 76vw, ${Math.round(100 / count)}vw`}
                />
              ))
            : Array.from({ length: count }, (_, i) => <div key={i} className="product-row__placeholder" />)}
        </div>
      </div>
    </section>
  );
}
