import clsx from "clsx";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-[12px]",
  lg: "h-14 w-14 text-sm",
  xl: "h-24 w-24 text-2xl",
};

// Editorial palette — solid stamp blocks, never gradients.
// Each option is paired with a contrast text class so initials stay legible.
const STAMPS = [
  "bg-ink text-paper",
  "bg-ember text-paper",
  "bg-sage-500 text-paper",
  "bg-ember-700 text-paper",
  "bg-sage-600 text-paper",
  "bg-ink-200 text-paper",
];

function pickStamp(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return STAMPS[h % STAMPS.length];
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ user, size = "md", className }) {
  const sz = SIZES[size] || SIZES.md;
  const seed = user?.id || user?.email || user?.name || "";
  const stamp = pickStamp(seed);

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name || "User avatar"}
        className={clsx(sz, "object-cover ring-1 ring-ink/15", className)}
      />
    );
  }

  return (
    <span
      aria-label={user?.name || "User avatar"}
      className={clsx(
        sz,
        "grid place-items-center font-mono font-medium tracking-wider select-none ring-1 ring-ink/10",
        stamp,
        className
      )}
    >
      {initials(user?.name)}
    </span>
  );
}
