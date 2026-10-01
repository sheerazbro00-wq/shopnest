import { Link } from "react-router-dom";
import { sized, srcSet } from "../../utils/format";
import "./SaleTiles.css";

export default function SaleTiles({ title, tiles }) {
  return (
    <section className="index-section sale-tiles">
      <div className="page-width">
        <h2 className="sale-tiles__title">{title}</h2>
        <div className="sale-tiles__grid">
          {tiles.map((t) => (
            <Link key={t.label} to={t.url} className="collection-item">
              <div className="collection-item__image">
                <img src={sized(t.image, 720)} srcSet={srcSet(t.image)} sizes="(max-width: 768px) 50vw, 25vw" alt="" loading="lazy" />
              </div>
              <span className="collection-item__title">
                <span>{t.label}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
