import { useEffect } from "react";
import { homeSections } from "../data/homeSections";
import HeroBanner from "../components/home/HeroBanner";
import FeaturedCollection from "../components/home/FeaturedCollection";
import SaleTiles from "../components/home/SaleTiles";

const components = {
  hero: HeroBanner,
  "featured-collection": FeaturedCollection,
  "sale-tiles": SaleTiles,
};

export default function Home() {
  useEffect(() => {
    document.title = "ShopNest";
  }, []);

  return (
    <>
      <h1 className="visually-hidden">ShopNest — Man</h1>
      {homeSections.map((section, i) => {
        const Section = components[section.type];
        return <Section key={`${section.type}-${i}`} {...section} />;
      })}
    </>
  );
}
