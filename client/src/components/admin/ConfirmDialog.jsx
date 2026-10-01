import { useEffect, useRef } from "react";

// Confirmation for destructive actions, built on the native <dialog>:
// showModal() gives focus trapping, Esc-to-close and a backdrop for free.
export default function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "Go back", tone = "critical", busy = false, onConfirm, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="adm-dialog"
      aria-labelledby="ConfirmTitle"
      onCancel={(e) => {
        e.preventDefault(); // Esc: let the parent own the open state
        if (!busy) onClose();
      }}
      onClick={(e) => e.target === ref.current && !busy && onClose()}
    >
      <div className="adm-dialog__body">
        <h2 id="ConfirmTitle">{title}</h2>
        <div className="adm-dialog__text">{children}</div>
      </div>
      <div className="adm-dialog__actions">
        <button type="button" className="adm-btn" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button type="button" className={`adm-btn adm-btn--${tone}`} onClick={onConfirm} disabled={busy} autoFocus>
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
