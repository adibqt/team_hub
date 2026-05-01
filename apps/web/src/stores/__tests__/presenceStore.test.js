import { usePresenceStore } from "../presenceStore";

beforeEach(() => {
  usePresenceStore.setState({ byWorkspace: {} });
});

describe("setOnline", () => {
  it("stores the user list under the given workspaceId", () => {
    usePresenceStore.getState().setOnline("ws1", ["u1", "u2"]);
    expect(usePresenceStore.getState().byWorkspace.ws1).toEqual(["u1", "u2"]);
  });

  it("normalises null/undefined into an empty array", () => {
    usePresenceStore.getState().setOnline("ws1", null);
    expect(usePresenceStore.getState().byWorkspace.ws1).toEqual([]);
  });

  it("preserves rosters for other workspaces", () => {
    usePresenceStore.getState().setOnline("ws1", ["u1"]);
    usePresenceStore.getState().setOnline("ws2", ["u2"]);
    expect(usePresenceStore.getState().byWorkspace).toEqual({
      ws1: ["u1"],
      ws2: ["u2"],
    });
  });

  it("ignores calls without a workspaceId", () => {
    usePresenceStore.getState().setOnline(null, ["u1"]);
    usePresenceStore.getState().setOnline(undefined, ["u1"]);
    expect(usePresenceStore.getState().byWorkspace).toEqual({});
  });
});

describe("clear", () => {
  it("removes only the targeted workspace, leaving others intact", () => {
    usePresenceStore.setState({
      byWorkspace: { ws1: ["u1"], ws2: ["u2"] },
    });
    usePresenceStore.getState().clear("ws1");
    expect(usePresenceStore.getState().byWorkspace).toEqual({ ws2: ["u2"] });
  });

  it("ignores empty workspaceIds", () => {
    usePresenceStore.setState({ byWorkspace: { ws1: ["u1"] } });
    usePresenceStore.getState().clear(null);
    expect(usePresenceStore.getState().byWorkspace).toEqual({ ws1: ["u1"] });
  });
});
