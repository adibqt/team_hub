import { useThemeStore } from "../themeStore";

// Minimal MediaQueryList stub. The store only uses .matches and add/remove
// listeners, so we just need to be able to drive `change` events manually.
function installMatchMedia({ prefersDark = false } = {}) {
  const listeners = new Set();
  const mql = {
    matches: prefersDark,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_e, fn) => listeners.add(fn),
    removeEventListener: (_e, fn) => listeners.delete(fn),
    onchange: null,
    addListener: (fn) => listeners.add(fn),
    removeListener: (fn) => listeners.delete(fn),
    dispatchEvent: () => true,
    _trigger(matches) {
      this.matches = matches;
      for (const fn of listeners) fn({ matches });
    },
  };
  window.matchMedia = jest.fn().mockReturnValue(mql);
  return mql;
}

beforeEach(() => {
  // Hard reset — Zustand persists module state across tests so we rebuild it.
  useThemeStore.setState({
    preference: "system",
    system: "light",
    resolved: "light",
    hydrated: false,
  });
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
  window.localStorage.clear();
});

describe("init", () => {
  it("hydrates from localStorage and applies the dark class for explicit dark", () => {
    window.localStorage.setItem("th:theme", "dark");
    installMatchMedia({ prefersDark: false });

    useThemeStore.getState().init();

    const state = useThemeStore.getState();
    expect(state.preference).toBe("dark");
    expect(state.resolved).toBe("dark");
    expect(state.hydrated).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("respects 'prefers-color-scheme: dark' when preference is 'system'", () => {
    installMatchMedia({ prefersDark: true });
    useThemeStore.getState().init();

    const state = useThemeStore.getState();
    expect(state.preference).toBe("system");
    expect(state.system).toBe("dark");
    expect(state.resolved).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("falls back to 'system' for unknown stored values", () => {
    window.localStorage.setItem("th:theme", "neon");
    installMatchMedia({ prefersDark: false });

    useThemeStore.getState().init();

    expect(useThemeStore.getState().preference).toBe("system");
  });

  it("re-resolves when the OS preference flips", () => {
    const mql = installMatchMedia({ prefersDark: false });
    useThemeStore.getState().init();
    expect(useThemeStore.getState().resolved).toBe("light");

    mql._trigger(true); // OS switched to dark

    expect(useThemeStore.getState().system).toBe("dark");
    expect(useThemeStore.getState().resolved).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("is idempotent — second init() does nothing", () => {
    installMatchMedia({ prefersDark: false });
    useThemeStore.getState().init();
    const before = useThemeStore.getState();
    useThemeStore.getState().init();
    expect(useThemeStore.getState()).toBe(before);
  });
});

describe("setPreference", () => {
  beforeEach(() => {
    installMatchMedia({ prefersDark: false });
    useThemeStore.getState().init();
  });

  it("updates the preference, applies the class, and persists to localStorage", () => {
    useThemeStore.getState().setPreference("dark");

    expect(useThemeStore.getState().preference).toBe("dark");
    expect(useThemeStore.getState().resolved).toBe("dark");
    expect(window.localStorage.getItem("th:theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("ignores invalid preferences", () => {
    useThemeStore.getState().setPreference("rainbow");
    expect(useThemeStore.getState().preference).toBe("system");
  });
});

describe("cyclePreference", () => {
  it("cycles system → light → dark → system", () => {
    installMatchMedia({ prefersDark: false });
    useThemeStore.getState().init();

    const order = [];
    for (let i = 0; i < 4; i++) {
      order.push(useThemeStore.getState().preference);
      useThemeStore.getState().cyclePreference();
    }
    expect(order).toEqual(["system", "light", "dark", "system"]);
  });
});
