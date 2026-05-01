import { render, screen } from "@testing-library/react";
import Avatar from "../Avatar";

describe("Avatar", () => {
  it("renders an <img> with the user's name as alt when avatarUrl is set", () => {
    render(<Avatar user={{ name: "Alice Wonder", avatarUrl: "/a.png" }} />);
    const img = screen.getByRole("img", { name: "Alice Wonder" });
    expect(img).toHaveAttribute("src", "/a.png");
  });

  it("falls back to the user's initials in a stamp when no avatarUrl is set", () => {
    render(<Avatar user={{ id: "u1", name: "Alice Wonder" }} />);
    expect(screen.getByLabelText("Alice Wonder")).toHaveTextContent("AW");
  });

  it("uses the first character for single-word names", () => {
    render(<Avatar user={{ name: "Alice" }} />);
    expect(screen.getByLabelText("Alice")).toHaveTextContent("A");
  });

  it("renders '?' for empty/missing names", () => {
    render(<Avatar user={{}} />);
    expect(screen.getByLabelText("User avatar")).toHaveTextContent("?");
  });

  it("is deterministic — same seed picks the same stamp class twice", () => {
    const { container: a } = render(<Avatar user={{ id: "u1", name: "Alice" }} />);
    const { container: b } = render(<Avatar user={{ id: "u1", name: "Alice" }} />);
    expect(a.firstChild.className).toBe(b.firstChild.className);
  });
});
