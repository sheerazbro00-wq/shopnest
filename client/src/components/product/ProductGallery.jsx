import { useCallback, useEffect, useRef, useState } from "react";
import { sized, srcSet } from "../../utils/format";
import { ChevronDown, ChevronUp, SearchIcon } from "../Icons";
import ImageZoom from "./ImageZoom";
import "./ProductGallery.css";

const THUMB_STEP = 133; // thumb height + gap

// Desktop: vertical thumbnails + one main image. Mobile (≤768px): the same
// slides become a swipeable scroll-snap track with dots; no JS carousel lib.
export default function ProductGallery({ images, title }) {
  const [index, setIndex] = useState(0);
  const [zoomAt, setZoomAt] = useState(null);
  const [thumbScroll, setThumbScroll] = useState({ up: false, down: false });
  const trackRef = useRef(null);
  const thumbsRef = useRef(null);

  const updateThumbArrows = useCallback(() => {
    const el = thumbsRef.current;
    if (!el) return;
    setThumbScroll({ up: el.scrollTop > 2, down: el.scrollTop + el.clientHeight < el.scrollHeight - 2 });
  }, []);

  useEffect(() => {
    setIndex(0);
    trackRef.current?.scrollTo({ left: 0 });
    thumbsRef.current?.scrollTo({ top: 0 });
    updateThumbArrows();
    window.addEventListener("resize", updateThumbArrows);
    return () => window.removeEventListener("resize", updateThumbArrows);
  }, [images, updateThumbArrows]);

  // Keep the active thumbnail visible without scrolling the whole page.
  useEffect(() => {
    const list = thumbsRef.current;
    const thumb = list?.children[index];
    if (!thumb) return;
    if (thumb.offsetTop < list.scrollTop) list.scrollTo({ top: thumb.offsetTop, behavior: "smooth" });
    else if (thumb.offsetTop + thumb.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTo({ top: thumb.offsetTop + thumb.offsetHeight - list.clientHeight, behavior: "smooth" });
  }, [index]);

  // Mobile: derive the active slide from the scroll position (closest to centre).
  const onTrackScroll = () => {
    const track = trackRef.current;
    const center = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    [...track.children].forEach((slide, i) => {
      const dist = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    if (best !== index) setIndex(best);
  };

  const goToSlide = (i) => {
    const track = trackRef.current;
    const slide = track?.children[i];
    if (slide) track.scrollTo({ left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2, behavior: "smooth" });
    setIndex(i);
  };

  if (!images.length) return <div className="product-gallery product-gallery--empty" />;

  return (
    <div className="product-gallery">
      {images.length > 1 && (
        <div className="product-gallery__thumbs">
          {thumbScroll.up && (
            <button
              type="button"
              className="product-gallery__thumb-arrow product-gallery__thumb-arrow--up"
              aria-label="Scroll thumbnails up"
              onClick={() => thumbsRef.current.scrollBy({ top: -THUMB_STEP * 2, behavior: "smooth" })}
            >
              <ChevronUp />
            </button>
          )}
          <div className="product-gallery__thumb-list" ref={thumbsRef} onScroll={updateThumbArrows}>
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                className={`product-gallery__thumb${i === index ? " is-active" : ""}`}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
              >
                <img src={sized(src, 180)} alt="" loading="lazy" onLoad={i === 0 ? updateThumbArrows : undefined} />
              </button>
            ))}
          </div>
          {thumbScroll.down && (
            <button
              type="button"
              className="product-gallery__thumb-arrow product-gallery__thumb-arrow--down"
              aria-label="Scroll thumbnails down"
              onClick={() => thumbsRef.current.scrollBy({ top: THUMB_STEP * 2, behavior: "smooth" })}
            >
              <ChevronDown />
            </button>
          )}
        </div>
      )}

      <div className="product-gallery__main">
        <div className="product-gallery__track" ref={trackRef} onScroll={onTrackScroll}>
          {images.map((src, i) => (
            <div key={src} className={`product-gallery__slide${i === index ? " is-active" : ""}`}>
              <button type="button" className="product-gallery__image-btn" aria-label="Zoom image" onClick={() => setZoomAt(i)}>
                <img
                  src={sized(src, 900)}
                  srcSet={srcSet(src, [360, 540, 720, 900, 1080, 1296])}
                  sizes="(max-width: 768px) 75vw, 40vw"
                  alt={i === 0 ? title : `${title} - image ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </button>
              <button type="button" className="product-gallery__zoom" aria-label="Zoom image" onClick={() => setZoomAt(i)}>
                <SearchIcon />
              </button>
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <div className="product-gallery__dots">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                className={`product-gallery__dot${i === index ? " is-active" : ""}`}
                aria-label={`Go to image ${i + 1}`}
                onClick={() => goToSlide(i)}
              />
            ))}
          </div>
        )}
      </div>

      {zoomAt !== null && (
        <ImageZoom images={images} start={zoomAt} title={title} onClose={() => setZoomAt(null)} />
      )}
    </div>
  );
}
