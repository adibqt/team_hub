"use client";
import { forwardRef, useId } from "react";
import clsx from "clsx";

/**
 * Editorial form field.
 * - Mono, uppercase, tracking-widest2 label with an ember tick "§ NN"
 * - Paper input with an ink underline that thickens on focus
 * - Inline hint and rose error
 */
const Field = forwardRef(function Field(
  {
    label,
    n,
    hint,
    error,
    type = "text",
    multiline = false,
    rows = 3,
    className,
    ...props
  },
  ref
) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-err` : undefined;
  const Tag = multiline ? "textarea" : "input";
  const tagProps = multiline ? { rows } : { type };

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-2"
        >
          {n && <span className="text-ember tabular-nums">{n}</span>}
          <span>{label}</span>
        </label>
      )}
      <Tag
        ref={ref}
        id={id}
        aria-invalid={!!error}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={clsx(
          "w-full bg-transparent text-ink placeholder:text-ink/30",
          "px-0 py-2 text-[15px] leading-relaxed",
          "border-0 border-b transition-colors outline-none",
          "focus:ring-0",
          error
            ? "border-ember-500 focus:border-ember-600"
            : "border-ink/20 hover:border-ink/45 focus:border-ink",
          multiline && "resize-y min-h-[5rem]"
        )}
        {...tagProps}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="mt-2 text-xs text-ink/55 leading-relaxed">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs font-medium text-ember flex items-baseline gap-2"
        >
          <span aria-hidden="true">×</span>
          {error}
        </p>
      )}
    </div>
  );
});

export default Field;
