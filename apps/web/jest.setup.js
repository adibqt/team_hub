// Adds the toBeInTheDocument / toHaveAttribute / etc. matchers for RTL.
import "@testing-library/jest-dom";

// jsdom doesn't ship matchMedia — many UI bits (theme, responsive checks)
// reach for it on import, so we polyfill it before any component is mounted.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
