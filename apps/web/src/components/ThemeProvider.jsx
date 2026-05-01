"use client";
import { useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";

// Mounts once at the root: hydrates the theme store from localStorage +
// matchMedia, and keeps the resolved theme in sync with OS-level changes
// (e.g., the user flips macOS Dark Mode while the tab is open).
export default function ThemeProvider({ children }) {
  const init = useThemeStore((s) => s.init);

  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  return children;
}
