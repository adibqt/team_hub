"use client";
import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

/**
 * Editorial form field.
 * - Mono uppercase micro-label paired with a numeric prefix.
 * - Hairline border on the bottom only; whole field shifts on focus.
 * - Ember accent on focus, ink on hover, ember-700 on error.
 */
const FormField = forwardRef(function FormField(
  {
    label,
    icon: Icon,
    type = "text",
    error,
    hint,
    className,
    index, // optional "01", "02"… numeric prefix
    ...props
  },
  ref
) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (reveal ? "text" : "password") : type;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-err` : undefined;

  return (
    <div className={clsx("group/field", className)}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <label
          htmlFor={id}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-ink/60"
        >
          {index && (
            <span className="text-ink/35 tabular-nums" aria-hidden="true">
              {index}
            </span>
          )}
          <span>{label}</span>
        </label>
        {hint && !error && (
          <span
            id={hintId}
            className="hidden sm:inline font-mono text-[10px] tracking-wider text-ink/40 lowercase"
          >
            {hint}
          </span>
        )}
      </div>

      <div
        className={clsx(
          "relative flex items-center border-b transition-colors duration-200",
          error
            ? "border-ember-600"
            : "border-ink/20 hover:border-ink/45 focus-within:border-ember"
        )}
      >
        {Icon && (
          <Icon
            aria-hidden="true"
            className={clsx(
              "shrink-0 mr-3 transition-colors duration-200",
              error ? "text-ember-600" : "text-ink/35 group-focus-within/field:text-ember"
            )}
            size={16}
            strokeWidth={1.75}
          />
        )}
        <input
          ref={ref}
          id={id}
          type={inputType}
          aria-invalid={!!error}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className={clsx(
            "w-full bg-transparent py-3 text-[15px] leading-6 text-ink",
            "placeholder:text-ink/30 placeholder:font-light",
            "outline-none focus:outline-none",
            "selection:bg-ink selection:text-paper",
            isPassword ? "pr-10" : ""
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            className={clsx(
              "absolute right-0 top-1/2 -translate-y-1/2 p-2",
              "text-ink/40 hover:text-ink transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            )}
          >
            {reveal ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
          </button>
        )}
      </div>

      {hint && !error && (
        <p
          id={hintId}
          className="sm:hidden mt-1.5 font-mono text-[10px] tracking-wider text-ink/45 lowercase"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-ember-700"
        >
          <span aria-hidden="true" className="inline-block h-px w-3 bg-ember-700" />
          {error}
        </p>
      )}
    </div>
  );
});

export default FormField;
