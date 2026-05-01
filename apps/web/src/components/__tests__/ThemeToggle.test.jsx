import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle, { ThemeToggleIcon } from "../ThemeToggle";
import { useThemeStore } from "@/stores/themeStore";

beforeEach(() => {
  // Hydrated=true so the toggle isn't visually muted, with a known preference.
  useThemeStore.setState({
    preference: "system",
    system: "light",
    resolved: "light",
    hydrated: true,
  });
});

describe("ThemeToggle (segmented)", () => {
  it("renders the three theme options", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("radio", { name: "System" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeInTheDocument();
  });

  it("marks the current preference as aria-checked", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("radio", { name: "System" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("invokes setPreference when an option is clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    // The store integrates with localStorage; the call wires through there.
    expect(useThemeStore.getState().preference).toBe("dark");
  });
});

describe("ThemeToggleIcon (cycle)", () => {
  it("advertises the next state in its aria-label", () => {
    render(<ThemeToggleIcon />);
    // Starting from 'system' the next option is 'Light'.
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label", expect.stringMatching(/Switch to Light/i));
  });

  it("cycles preferences on click: system → light → dark → system", async () => {
    const user = userEvent.setup();
    render(<ThemeToggleIcon />);
    const btn = screen.getByRole("button");

    await user.click(btn);
    expect(useThemeStore.getState().preference).toBe("light");

    await user.click(btn);
    expect(useThemeStore.getState().preference).toBe("dark");

    await user.click(btn);
    expect(useThemeStore.getState().preference).toBe("system");
  });
});
