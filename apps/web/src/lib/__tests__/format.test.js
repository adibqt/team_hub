import { fmtDate, fmtRelative } from "../format.js";

describe("fmtDate", () => {
  it("formats an ISO string into 'MMM d, yyyy'", () => {
    // Use a UTC midpoint to dodge cross-TZ flakiness around midnight.
    expect(fmtDate("2024-03-15T12:00:00Z")).toMatch(/^Mar 15, 2024$/);
  });

  it("accepts Date instances directly", () => {
    expect(fmtDate(new Date("2024-12-01T12:00:00Z"))).toMatch(/^Dec 1, 2024$/);
  });

  it("accepts unix epoch numbers", () => {
    // 2024-01-15T00:00:00Z = 1705276800000
    const formatted = fmtDate(1705276800000 + 12 * 3600 * 1000);
    expect(formatted).toBe("Jan 15, 2024");
  });
});

describe("fmtRelative", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2024-06-01T12:00:00Z"));
  });
  afterEach(() => jest.useRealTimers());

  it("appends an 'ago' suffix for past dates", () => {
    const out = fmtRelative("2024-06-01T11:00:00Z");
    expect(out).toMatch(/ago$/);
  });

  it("uses 'in …' for future dates", () => {
    const out = fmtRelative("2024-06-01T13:00:00Z");
    expect(out.startsWith("in ")).toBe(true);
  });
});
