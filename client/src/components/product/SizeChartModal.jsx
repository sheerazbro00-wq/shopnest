import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { CloseIcon } from "../Icons";
import "./SizeChartModal.css";

// `html` is the sanitized table markup stored on the product at seed time.
// `guideSection` ("tops" | "bottoms" | "shoes") deep-links the general size guide.
export default function SizeChartModal({ html, guideSection = "tops", onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label="Size chart" onClick={onClose}>
      <div className="modal__inner" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal__close" ref={closeRef} aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
        <div className="size-chart rte" dangerouslySetInnerHTML={{ __html: html }} />
        <p className="size-chart__guide">
          Not sure of your measurements?{" "}
          <Link to={`/pages/size-guides#${guideSection}`} onClick={onClose}>
            See how to measure &amp; full size guide
          </Link>
        </p>
      </div>
    </div>,
    document.body
  );
}
