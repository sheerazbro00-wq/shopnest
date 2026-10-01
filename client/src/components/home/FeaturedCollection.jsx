import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts } from "../../api/products";
import ProductCard from "../product/ProductCard";
import "./FeaturedCollection.css";

export default function FeaturedCollection({ title, collection, url, count = 5 }) {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchProducts({ collection, limit: count })
      .then((data) => !cancelled && setProducts(data.products))
      .catch(() => !cancelled && setProducts([]));
    return () => {
      cancelled = true;
    };
  }, [collection, count]);

  return (
    <section className="index-section featured-collection">
      <div className="page-width">
        <header className={`section-header${title ? "" : " section-header--no-title"}`}>
          {title && <h2 className="section-header__title">{title}</h2>}
          <Link to={url} className="section-header__link">
            View all
          </Link>
        </header>
      </div>

      <div className="featured-collection__scroller">
        <div className="featured-collection__grid">
          {products
            ? products.map((p) => <ProductCard key={p.handle} product={p} />)
            : Array.from({ length: count }, (_, i) => <div key={i} className="featured-collection__placeholder" />)}
        </div>
      </div>
    </section>
  );
}
