import { Link } from "react-router-dom";
import { sized } from "../../utils/format";
import "./HeroBanner.css";

export default function HeroBanner({ title, subtitle, image, mobileImage, url, titleScale = 1, eager = false }) {
  return (
    <section className="index-section--hero">
      <Link to={url} className="hero" style={{ "--title-scale": titleScale }}>
        <picture className="hero__media">
          <source media="(max-width: 768px)" srcSet={`${sized(mobileImage, 750)} 750w, ${sized(mobileImage, 1200)} 1200w`} sizes="100vw" />
          <img
            src={sized(image, 1920)}
            srcSet={`${sized(image, 1200)} 1200w, ${sized(image, 1600)} 1600w, ${sized(image, 1920)} 1920w`}
            sizes="100vw"
            alt=""
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
          />
        </picture>
        <div className="hero__text">
          {subtitle && <p className="hero__subtitle">{subtitle}</p>}
          <h2 className="hero__title">{title}</h2>
        </div>
      </Link>
    </section>
  );
}
