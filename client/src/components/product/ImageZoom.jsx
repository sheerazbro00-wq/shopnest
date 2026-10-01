import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sized } from "../../utils/format";
import { ChevronLeft, ChevronRight, CloseIcon } from "../Icons";
import "./ImageZoom.css";

// Full-screen image viewer. Slides are a scroll-snap track, so touch swipe
// works natively; arrows and keyboard just scroll the track.
export default function ImageZoom({ images, start = 0, title, onClose }) {
  const [index, setIndex] = useState(start);
  const trackRef = useRef(null);
  const closeRef = useRef(null);

  const go = (i) => {
    const track = trackRef.current;
    const next = (i + images.length) % images.length;
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    trackRef.current.scrollTo({ left: start * trackRef.current.clientWidth });
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [start]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onScroll = () => {
    const track = trackRef.current;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  return createPortal(
    <div className="image-zoom" role="dialog" aria-modal="true" aria-label={`${title} images`}>
      <div className="image-zoom__track" ref={trackRef} onScroll={onScroll}>
        {images.map((src, i) => (
          <div key={src} className="image-zoom__slide">
            <img src={sized(src, 1800)} alt={`${title} - image ${i + 1}`} loading={Math.abs(i - start) <= 1 ? "eager" : "lazy"} />
          </div>
        ))}
      </div>

      <div className="image-zoom__counter">
        {index + 1} / {images.length}
      </div>
      <button type="button" className="image-zoom__close" ref={closeRef} aria-label="Close" onClick={onClose}>
        <CloseIcon />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" className="image-zoom__arrow image-zoom__arrow--prev" aria-label="Previous image" onClick={() => go(index - 1)}>
            <ChevronLeft />
          </button>
          <button type="button" className="image-zoom__arrow image-zoom__arrow--next" aria-label="Next image" onClick={() => go(index + 1)}>
            <ChevronRight />
          </button>
        </>
      )}
    </div>,
    document.body
  );
}
