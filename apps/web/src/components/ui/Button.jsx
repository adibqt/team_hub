import { forwardRef } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

const VARIANTS = {
  // Solid ink, paper text — the editorial primary
  primary:
    "bg-ink text-paper border border-ink hover:bg-ink-300 active:bg-ink-200 disabled:opacity-50",
  // Outlined neutral
  secondary:
    "bg-paper text-ink border border-ink/20 hover:border-ink/45 hover:bg-paper-50 disabled:opacity-50",
  // Burnt ember accent
  ember:
    "bg-ember text-paper border border-ember hover:bg-ember-600 active:bg-ember-700 disabled:opacity-50",
  // Quiet ghost
  ghost:
    "bg-transparent text-ink/70 border border-transparent hover:text-ink hover:bg-paper-50 disabled:opacity-50",
  // Destructive — outlined ember on hover
  danger:
    "bg-paper text-ink border border-ink/15 hover:border-ember hover:text-ember hover:bg-ember-50 disabled:opacity-50",
};

const SIZES = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-5 py-2.5 text-[13px]",
  lg: "px-6 py-3 text-sm",
};

const Button = forwardRef(function Button(
  { variant = "primary", size = "md", loading, leftIcon: L, rightIcon: R, className, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={loading || props.disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2.5 font-mono uppercase tracking-widest2 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        "disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
      ) : (
        L && <L size={14} strokeWidth={1.75} aria-hidden="true" />
      )}
      <span className="font-mono">{children}</span>
      {!loading && R && <R size={14} strokeWidth={1.75} aria-hidden="true" />}
    </button>
  );
});

export default Button;
