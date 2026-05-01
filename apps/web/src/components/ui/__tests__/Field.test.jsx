import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Field from "../Field";

describe("Field", () => {
  it("renders an input by default and forwards typed value", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<Field label="Email" onChange={onChange} />);

    const input = screen.getByLabelText(/email/i);
    expect(input.tagName).toBe("INPUT");

    await user.type(input, "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders the label number prefix when `n` is provided", () => {
    render(<Field label="Email" n="01" />);
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("renders a textarea when multiline is set", () => {
    render(<Field label="Notes" multiline rows={5} />);
    const ta = screen.getByLabelText(/notes/i);
    expect(ta.tagName).toBe("TEXTAREA");
    expect(ta).toHaveAttribute("rows", "5");
  });

  it("shows the hint when no error is present", () => {
    render(<Field label="Email" hint="We'll never share it" />);
    expect(screen.getByText("We'll never share it")).toBeInTheDocument();
  });

  it("replaces the hint with the error and flips aria-invalid", () => {
    render(<Field label="Email" hint="We'll never share it" error="Required" />);

    expect(screen.queryByText("We'll never share it")).not.toBeInTheDocument();
    const err = screen.getByRole("alert");
    expect(err).toHaveTextContent("Required");
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("links the input to its hint and error via aria-describedby", () => {
    render(<Field label="Email" hint="optional" />);
    const input = screen.getByLabelText(/email/i);
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy)).toHaveTextContent("optional");
  });

  it("forwards the ref to the underlying element", () => {
    const ref = { current: null };
    render(<Field label="Email" ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current.tagName).toBe("INPUT");
  });
});
