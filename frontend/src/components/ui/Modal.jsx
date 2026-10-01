import { useEffect, useRef } from "react";
import Button from "./Button.jsx";

export default function Modal({ children, onClose, open, title }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      aria-labelledby="modal-title"
      className="w-[min(36rem,calc(100%-2rem))] rounded-sm border border-gov-border bg-white p-0 text-gov-ink shadow-xl backdrop:bg-slate-950/50"
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between gap-4 border-b border-gov-border px-5 py-4">
        <h2 className="font-display text-xl font-semibold" id="modal-title">
          {title}
        </h2>
        <Button onClick={onClose} size="sm" variant="secondary">
          Close
        </Button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
