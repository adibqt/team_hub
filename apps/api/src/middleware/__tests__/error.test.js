import { errorHandler } from "../error.js";

describe("errorHandler", () => {
  // Silence the console.error noise inside the handler so the test reporter
  // stays clean — the handler is *supposed* to log, we just don't want it
  // crowding our test output.
  let consoleSpy;
  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => consoleSpy.mockRestore());

  function makeRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it("uses err.status when present", () => {
    const res = makeRes();
    errorHandler({ status: 418, message: "teapot" }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({ error: "teapot" });
  });

  it("falls back to err.statusCode when err.status is missing", () => {
    const res = makeRes();
    errorHandler({ statusCode: 422, message: "bad" }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: "bad" });
  });

  it("defaults to 500 with a generic message when nothing is set", () => {
    const res = makeRes();
    errorHandler({}, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("preserves the error's own message even at 500", () => {
    const res = makeRes();
    errorHandler({ message: "boom" }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "boom" });
  });
});
