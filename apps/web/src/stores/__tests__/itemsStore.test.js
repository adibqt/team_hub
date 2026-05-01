jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { useItemsStore } from "../itemsStore";

beforeEach(() => {
  useItemsStore.setState({ items: [] });
  jest.clearAllMocks();
});

describe("offline replay id mapping (items)", () => {
  it("replaces optimistic temp item when offline:idmap event targets /items", () => {
    useItemsStore.setState({
      items: [{ id: "tmp_1", title: "Draft", workspaceId: "ws1", _pending: true }],
    });

    window.dispatchEvent(
      new CustomEvent("offline:idmap", {
        detail: { tempId: "tmp_1", real: { id: "i1", title: "Draft", workspaceId: "ws1" }, url: "/api/workspaces/ws1/items" },
      })
    );

    expect(useItemsStore.getState().items).toEqual([
      { id: "i1", title: "Draft", workspaceId: "ws1" },
    ]);
  });

  it("ignores id map events for non-item URLs", () => {
    useItemsStore.setState({ items: [{ id: "tmp_2", title: "Keep me" }] });

    window.dispatchEvent(
      new CustomEvent("offline:idmap", {
        detail: { tempId: "tmp_2", real: { id: "i2", title: "Keep me" }, url: "/api/workspaces/ws1/goals" },
      })
    );

    expect(useItemsStore.getState().items).toEqual([{ id: "tmp_2", title: "Keep me" }]);
  });
});
