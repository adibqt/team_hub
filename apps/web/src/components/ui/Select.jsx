"use client";
import { forwardRef, useId } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";

const Select = forwardRef(function Select(
  { label, n, hint, error, children, className, ...props },
  ref
) {
  const id = useId();
  const errorId = error ? `${id}-err` : undefined;

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
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={clsx(
            "w-full bg-transparent text-ink appearance-none pr-7 py-2 text-[14px]",
            "border-0 border-b transition-colors outline-none cursor-pointer",
            error
              ? "border-ember-500 focus:border-ember-600"
              : "border-ink/20 hover:border-ink/45 focus:border-ink"
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          size={14}
          strokeWidth={1.75}
          className="absolute right-0 top-1/2 -translate-y-1/2 text-ink/45 pointer-events-none"
        />
      </div>
      {hint && !error && <p className="mt-2 text-xs text-ink/55">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-ember">
          {error}
        </p>
      )}
    </div>
  );
});

export default Select;
