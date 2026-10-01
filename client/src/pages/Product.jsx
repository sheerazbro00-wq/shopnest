import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchProduct } from "../api/products";
import { MAX_QTY, useCart } from "../context/CartContext";
import { formatPrice } from "../utils/format";
import { addRecentlyViewed } from "../utils/recentlyViewed";
import QtySelector from "../components/common/QtySelector";
import ProductGallery from "../components/product/ProductGallery";
import SizeChartModal from "../components/product/SizeChartModal";

const BOTTOM_TYPES = /JEANS|PANTS|TROUSERS|CHINOS|CARGOS|SHORTS|SWEATPANTS|BOXERS/;

// Which part of /pages/size-guides fits this product (#shoes / #bottoms / #tops).
function guideSection(product) {
  if (product.collections && "man-shoes" in product.collections) return "shoes";
  return BOTTOM_TYPES.test(product.productType || "") ? "bottoms" : "tops";
}
import ProductRecommendations from "../components/product/ProductRecommendations";
import { ChevronDown, SizeChartIcon } from "../components/Icons";
import "./Product.css";

export default function Product() {
  const { handle } = useParams();
  const [product, setProduct] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let cancelled = false;
    setProduct(undefined);
    fetchProduct(handle)
      .then((p) => !cancelled && setProduct(p))
      .catch(() => !cancelled && setProduct(null));
    return () => {
      cancelled = true;
    };
  }, [handle]);

  useEffect(() => {
    if (!product) return;
    document.title = `${product.title} – ShopNest`;
    addRecentlyViewed(product.handle);
  }, [product]);

  if (product === null) {
    return (
      <div className="page-width product-missing">
        <h1 className="product-missing__title">Product not found</h1>
        <p>This product may have been removed or the link is incorrect.</p>
        <Link to="/collections/man" className="btn">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="page-width product-section">
        {product ? (
          // key resets size/qty/accordions when a sibling colour is opened
          <ProductSingle key={product.handle} product={product} />
        ) : (
          <div className="product-single product-single--loading" aria-busy="true">
            <div className="product-single__skeleton-media" />
            <div className="product-single__skeleton-meta">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>
      <ProductRecommendations handle={handle} />
    </>
  );
}

function ProductSingle({ product }) {
  const variants = product.variants || [];
  const [size, setSize] = useState(() => (variants.find((v) => v.available) || variants[0])?.size);
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState({ description: false, care: false });
  const [chartOpen, setChartOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const navigate = useNavigate();

  const variant = variants.find((v) => v.size === size) || variants[0];
  const price = variant?.price ?? product.price;
  const compareAt = variant?.compareAtPrice ?? product.compareAtPrice;
  const onSale = compareAt && compareAt > price;
  const soldOut = !variant?.available;
  // current colour first, like the product cards
  const siblings = product.siblings?.length
    ? [product, ...product.siblings.filter((s) => s.handle !== product.handle)]
    : [product];

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(t);
  }, [added]);

  const addToCart = () => {
    addItem({ ...product, price }, size, qty);
    setAdded(true);
  };

  const buyNow = () => {
    addItem({ ...product, price }, size, qty, { openDrawer: false });
    navigate("/checkout");
  };

  const closeChart = useCallback(() => setChartOpen(false), []);

  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div className="product-single">
      <div className="product-single__media">
        <ProductGallery images={product.images || []} title={product.title} />
      </div>

      <div className="product-single__meta">
        <div className="product-block product-block--header">
          <h1 className="product-single__title">{product.title}</h1>
          {variant?.sku && <p className="product-single__sku">{variant.sku}</p>}
        </div>

        <div className="product-block product-block--price">
          {onSale && (
            <>
              <span className="visually-hidden">Regular price</span>
              <s className="product__price product__price--compare">{formatPrice(compareAt)}</s>
              <span className="visually-hidden">Sale price</span>
            </>
          )}
          <span className="product__price">{formatPrice(price)}</span>
          {onSale && (
            <span className="product__price-savings">Save {Math.round((1 - price / compareAt) * 100)}%</span>
          )}
        </div>

        <div className="product-block product-block--swatches">
          <span className="visually-hidden">Color — {product.color}</span>
          <div className="pdp-swatches">
            {siblings.map((s) => (
              <Link
                key={s.handle}
                to={`/products/${s.handle}`}
                className={`pdp-swatch${s.handle === product.handle ? " is-active" : ""}`}
                title={s.color}
                aria-label={s.color}
                aria-current={s.handle === product.handle ? "true" : undefined}
                replace
              >
                <span style={{ backgroundColor: s.colorHex || "#ccc" }} />
              </Link>
            ))}
          </div>
        </div>

        {variants.length > 0 && (
          <fieldset className="product-block variant-group">
            <legend className="variant__label">Size</legend>
            <div className="variant-input-wrap">
              {variants.map((v) => (
                <label key={v.size} className={`variant__button${v.available ? "" : " is-sold-out"}`}>
                  <input
                    type="radio"
                    name="size"
                    value={v.size}
                    checked={v.size === size}
                    onChange={() => setSize(v.size)}
                  />
                  <span>{v.size}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="product-block">
          <label className="product-block__label" htmlFor="Quantity">
            Quantity
          </label>
          <QtySelector id="Quantity" value={qty} onChange={setQty} max={MAX_QTY} />
        </div>

        {product.sizeChart && (
          <button type="button" className="size-chart-trigger" onClick={() => setChartOpen(true)}>
            Size chart
            <SizeChartIcon />
          </button>
        )}

        <div className="product-block product-block--buttons">
          <button type="button" className="pdp-btn pdp-btn--add" disabled={soldOut} onClick={addToCart}>
            {soldOut ? "Sold out" : added ? "Added to cart ✓" : "Add to cart"}
          </button>
          {!soldOut && (
            <button type="button" className="pdp-btn pdp-btn--buy" onClick={buyNow}>
              Buy it now
            </button>
          )}
        </div>

        {product.description && (
          <div className={`product-block pdp-collapsible${open.description ? " is-open" : ""}`}>
            <button
              type="button"
              className="pdp-collapsible__trigger"
              aria-expanded={open.description}
              aria-controls="ProductDescription"
              onClick={() => toggle("description")}
            >
              Description
              <ChevronDown className="pdp-collapsible__icon" />
            </button>
            <div id="ProductDescription" className="pdp-collapsible__content">
              <div className="pdp-collapsible__inner rte" dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          </div>
        )}

        {product.care?.length > 0 && (
          <div className={`care-accordion${open.care ? " is-open" : ""}`}>
            <button
              type="button"
              className="care-accordion__toggle"
              aria-expanded={open.care}
              aria-controls="ProductCare"
              onClick={() => toggle("care")}
            >
              <span className="care-accordion__title">Care instructions</span>
              <svg className="care-accordion__icon" viewBox="0 0 20 20" aria-hidden="true">
                <polyline points="4 8 10 14 16 8" />
              </svg>
            </button>
            <div id="ProductCare" className="care-accordion__content">
              <ul className="care-accordion__inner">
                {product.care.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <Link to="/pages/contact" className="ask-question">
          ASK A QUESTION
        </Link>
      </div>

      {chartOpen && <SizeChartModal html={product.sizeChart} guideSection={guideSection(product)} onClose={closeChart} />}
    </div>
  );
}
