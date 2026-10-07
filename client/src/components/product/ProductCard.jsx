import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { sized, srcSet } from "../../utils/format";
import { useMoney } from "../../context/CurrencyContext";
import { ChevronLeft, ChevronRight } from "../Icons";
import "./ProductCard.css";

const MAX_SWATCHES = 4;

export default function ProductCard({ product, sizesAttr = "(max-width: 768px) 80vw, 20vw", showSaleBadge = false }) {
  const siblings = useMemo(() => {
    const list = product.siblings?.length ? product.siblings : [product];
    const current = list.find((s) => s.handle === product.handle) || product;
    return [current, ...list.filter((s) => s.handle !== product.handle)];
  }, [product]);

  const [active, setActive] = useState(siblings[0]);
  const [slide, setSlide] = useState(0);
  const [quickAdd, setQuickAdd] = useState(false);
  const { addItem } = useCart();
  const money = useMoney();

  const images = active.images?.length ? active.images : [];
  const onSale = active.compareAtPrice && active.compareAtPrice > active.price;
  const discount = onSale ? Math.round((1 - active.price / active.compareAtPrice) * 100) : 0;
  const extra = siblings.length - MAX_SWATCHES;

  const selectColor = (s) => {
    setActive(s);
    setSlide(0);
  };

  const step = (dir) => setSlide((i) => (i + dir + images.length) % images.length);

  const add = (size) => {
    addItem(active, size, 1);
    setQuickAdd(false);
  };

  return (
    <div className="grid-product">
      <div className="grid-product__image-wrap">
        <Link to={`/products/${active.handle}`} className="grid-product__link" aria-label={product.title}>
          <div className="grid-product__image-mask">
            {images[slide] && (
              <img
                key={images[slide]}
                className="grid-product__image"
                src={sized(images[slide], 540)}
                srcSet={srcSet(images[slide])}
                sizes={sizesAttr}
                alt={`${product.title}${active.color ? ` - ${active.color}` : ""}`}
                loading="lazy"
              />
            )}
            {images[1] && slide === 0 && (
              <img className="grid-product__secondary" src={sized(images[1], 540)} srcSet={srcSet(images[1])} sizes={sizesAttr} alt="" loading="lazy" />
            )}
          </div>
        </Link>

        {showSaleBadge && discount > 0 && <div className="grid-product__tag">{discount}% OFF</div>}

        {images.length > 1 && (
          <>
            <button type="button" className="card-nav card-nav--prev" aria-label="Previous image" onClick={() => step(-1)}>
              <ChevronLeft />
            </button>
            <button type="button" className="card-nav card-nav--next" aria-label="Next image" onClick={() => step(1)}>
              <ChevronRight />
            </button>
          </>
        )}

        <button
          type="button"
          className="quick-add-btn"
          aria-label="Quick add"
          aria-expanded={quickAdd}
          onClick={() => setQuickAdd((q) => !q)}
        >
          +
        </button>

        {quickAdd && (
          <div className="quick-add">
            {active.sizes?.map((s) => (
              <button key={s.size} type="button" disabled={!s.available} onClick={() => add(s.size)}>
                {s.size}
              </button>
            ))}
          </div>
        )}
      </div>

      <Link to={`/products/${active.handle}`} className="grid-product__meta">
        <div className="grid-product__title">{product.title}</div>
        <div className="grid-product__price">
          {onSale && <s className="grid-product__price--original">{money(active.compareAtPrice)}</s>}
          <span className={onSale ? "grid-product__price--sale" : ""}>{money(active.price)}</span>
        </div>
      </Link>

      {siblings.length > 0 && (
        <div className="color-swatch-group">
          {siblings.slice(0, MAX_SWATCHES).map((s) => (
            <button
              key={s.handle}
              type="button"
              className={`swatch-link${s.handle === active.handle ? " active" : ""}`}
              title={s.color}
              aria-label={s.color}
              onClick={() => selectColor(s)}
            >
              <span className="swatch-box" style={{ backgroundColor: s.colorHex || "#ccc" }} />
            </button>
          ))}
          {extra > 0 && (
            <Link to={`/products/${active.handle}`} className="swatch-link swatch-more">
              +{extra}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
