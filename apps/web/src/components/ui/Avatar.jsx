import clsx from "clsx";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
};

// Deterministic gradient picked from the user id/name so the same user
// always gets the same colored avatar fallback.
const GRADIENTS = [
  "from-brand-500 to-violet-500",
  "from-violet-500 to-fuchsia-500",
  "from-emerald-500 to-cyan-500",
  "from-amber-500 to-rose-500",
  "from-cyan-500 to-brand-500",
  "from-rose-500 to-fuchsia-500",
];

function pickGradient(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
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
  const gradient = pickGradient(seed);

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name || "User avatar"}
        className={clsx(sz, "rounded-full object-cover ring-2 ring-white shadow-sm", className)}
      />
    );
  }

  return (
    <span
      aria-label={user?.name || "User avatar"}
      className={clsx(
        sz,
        "rounded-full bg-gradient-to-br grid place-items-center font-semibold text-white ring-2 ring-white shadow-sm select-none",
        gradient,
        className
      )}
    >
      {initials(user?.name)}
    </span>
  );
}
