import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "../Button";

describe("Button", () => {
  it("renders children inside a button element", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("invokes onClick when clicked", async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("defaults type='button' so it doesn't accidentally submit forms", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("forwards an explicit type", () => {
    render(<Button type="submit">Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("disables the button and swallows clicks while loading", async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<Button loading onClick={onClick}>Save</Button>);

    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respects an explicit disabled prop", async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<Button disabled onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders left/right icons in normal state but hides leftIcon while loading", () => {
    function L(props) {
      return <svg data-testid="left-icon" {...props} />;
    }
    function R(props) {
      return <svg data-testid="right-icon" {...props} />;
    }
    const { rerender } = render(
      <Button leftIcon={L} rightIcon={R}>Save</Button>,
    );
    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();

    rerender(<Button loading leftIcon={L} rightIcon={R}>Save</Button>);
    // While loading we swap the left icon for the spinner and drop the right one.
    expect(screen.queryByTestId("left-icon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("right-icon")).not.toBeInTheDocument();
  });
});
