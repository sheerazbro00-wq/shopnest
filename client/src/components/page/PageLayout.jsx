import { useEffect } from "react";
import "./Page.css";

// Shopify "page" template: centred title over a narrow rich-text column.
// Shared by About, FAQs, Contact, policies and the size guide.
// `compact`: the smaller 30.6px title used by form pages (Contact).
export default function PageLayout({ title, children, wide = false, compact = false }) {
  useEffect(() => {
    document.title = `${title} – ShopNest`;
  }, [title]);

  const classes = ["page-width", "page-width--narrow", "page-content"];
  if (wide) classes.push("page-content--wide");
  if (compact) classes.push("page-content--compact");

  return (
    <div className={classes.join(" ")}>
      <header className="section-header">
        <h1 className="section-header__title">{title}</h1>
      </header>
      <div className="rte">{children}</div>
    </div>
  );
}
