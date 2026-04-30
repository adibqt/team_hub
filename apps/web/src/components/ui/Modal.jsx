"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import clsx from "clsx";

/**
 * Editorial modal — paper card on grain backdrop, square corners,
 * mono uppercase title with section symbol + numeric stamp.
 */
export default function Modal({
  open,
  onClose,
  title,
  eyebrow,
  stamp,
  size = "md",
  children,
  footer,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const widths = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-2xl",
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 animate-fade-in"
    >
      {/* Backdrop with grain */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm cursor-default focus:outline-none"
      />
      <div className="absolute inset-0 grain pointer-events-none" aria-hidden="true" />

      {/* Card */}
      <div
        ref={ref}
        className={clsx(
          "relative z-10 w-full bg-paper text-ink shadow-2xl border border-ink/15 animate-fade-up",
          widths[size]
        )}
      >
        {/* ember corner mark */}
        <span
          aria-hidden="true"
          className="absolute -top-px left-0 h-px w-24 bg-ember"
        />

        {/* Header */}
        <div className="px-7 sm:px-10 pt-7 pb-5 border-b border-ink/15 flex items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-2 flex items-center gap-2">
                <span className="text-ember">§</span>
                <span>{eyebrow}</span>
                {stamp && (
                  <>
                    <span className="text-ink/25">·</span>
                    <span className="tabular-nums">{stamp}</span>
                  </>
                )}
              </p>
            )}
            {title && (
              <h2
                id="modal-title"
                className="font-display text-3xl leading-[1.1] tracking-tight text-ink"
              >
                {title}
              </h2>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="shrink-0 -mt-1 -mr-2 p-2 text-ink/45 hover:text-ink hover:bg-paper-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 sm:px-10 py-7">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-7 sm:px-10 py-5 border-t border-ink/15 bg-paper-50 flex flex-wrap items-center gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
