import { create } from "zustand";

// Three-state theme model: an explicit "light" / "dark" override or
// "system" which defers to `prefers-color-scheme`. The resolved theme is
// what we actually paint with — `system` collapses to one of the two.

const STORAGE_KEY = "th:theme";

function readStoredPreference() {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

function readSystem() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyToDocument(resolved) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function resolve(preference, system) {
  return preference === "system" ? system : preference;
}

export const useThemeStore = create((set, get) => ({
  preference: "system",      // user's chosen mode
  system: "light",           // current OS-level preference
  resolved: "light",         // what the UI is actually rendering
  hydrated: false,           // gate UI that depends on real values

  // Run once, client-side. Reads localStorage + matchMedia, applies the
  // class to <html>, and starts listening for OS-level changes.
  init: () => {
    if (typeof window === "undefined" || get().hydrated) return () => {};

    const preference = readStoredPreference();
    const system = readSystem();
    const resolved = resolve(preference, system);
    applyToDocument(resolved);
    set({ preference, system, resolved, hydrated: true });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => {
      const nextSystem = e.matches ? "dark" : "light";
      const next = resolve(get().preference, nextSystem);
      applyToDocument(next);
      set({ system: nextSystem, resolved: next });
    };
    // Older Safari uses addListener — guard to keep both paths working.
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else if (mq.removeListener) mq.removeListener(onChange);
    };
  },

  setPreference: (preference) => {
    if (preference !== "light" && preference !== "dark" && preference !== "system") return;
    const system = get().system;
    const resolved = resolve(preference, system);
    applyToDocument(resolved);
    try { window.localStorage.setItem(STORAGE_KEY, preference); } catch {}
    set({ preference, resolved });
  },

  // Cycle: system → light → dark → system. Convenient for a single-button toggle.
  cyclePreference: () => {
    const order = ["system", "light", "dark"];
    const i = order.indexOf(get().preference);
    const next = order[(i + 1) % order.length];
    get().setPreference(next);
  },
}));
