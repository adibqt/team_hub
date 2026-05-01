import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "../Modal";

describe("Modal", () => {
  it("renders nothing when open=false", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hi">
        <p>body</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("body")).not.toBeInTheDocument();
  });

  it("renders the title, eyebrow, stamp, and body when open", () => {
    render(
      <Modal open onClose={() => {}} title="New Goal" eyebrow="Goals" stamp="07">
        <p>body</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "New Goal" })).toBeInTheDocument();
    expect(screen.getByText("Goals")).toBeInTheDocument();
    expect(screen.getByText("07")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("calls onClose when the close (X) button is clicked", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Hi">
        <p>body</p>
      </Modal>,
    );
    // Two close buttons exist (backdrop + X). Click the X icon's button.
    const buttons = screen.getAllByRole("button", { name: "Close" });
    await user.click(buttons[buttons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Hi">
        <p>body</p>
      </Modal>,
    );
    const buttons = screen.getAllByRole("button", { name: "Close" });
    await user.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title="Hi">
        <p>body</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("locks the page scroll while open and restores it on close", () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} title="Hi">
        <p>body</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Modal open={false} onClose={() => {}} title="Hi">
        <p>body</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("renders a footer when provided", () => {
    render(
      <Modal open onClose={() => {}} title="Hi" footer={<button>OK</button>}>
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });
});
