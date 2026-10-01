import { useCallback, useEffect, useState } from "react";

// Tiny toast: const [toast, show] = useToast(); ... show("Saved"); ... <Toast {...toast} />
export function useToast() {
  const [toast, setToast] = useState({ message: "", id: 0, error: false });
  const show = useCallback((message, { error = false } = {}) => setToast((t) => ({ message, error, id: t.id + 1 })), []);
  return [toast, show];
}

export default function Toast({ message, id, error }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, [id, message]);

  return (
    <div className={`adm-toast${visible ? " is-visible" : ""}${error ? " adm-toast--error" : ""}`} role="status" aria-live="polite">
      {visible && message}
    </div>
  );
}
