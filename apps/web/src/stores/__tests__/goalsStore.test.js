jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { useGoalsStore } from "../goalsStore";

beforeEach(() => {
  useGoalsStore.setState({ goals: [], goalById: {}, updatesByGoalId: {} });
  jest.clearAllMocks();
});

describe("offline replay id mapping (goals)", () => {
  it("replaces optimistic goal temp id from offline:idmap", () => {
    useGoalsStore.setState({
      goals: [{ id: "tmp_goal", title: "Launch", _pending: true }],
    });

    window.dispatchEvent(
      new CustomEvent("offline:idmap", {
        detail: { tempId: "tmp_goal", real: { id: "g1", title: "Launch" }, url: "/api/workspaces/ws1/goals" },
      })
    );

    expect(useGoalsStore.getState().goals).toEqual([{ id: "g1", title: "Launch" }]);
  });

  it("replaces optimistic milestone temp id from offline:idmap", () => {
    useGoalsStore.setState({
      goals: [{ id: "g1", milestones: [{ id: "tmp_ms", goalId: "g1", title: "M1" }] }],
      goalById: { g1: { id: "g1", milestones: [{ id: "tmp_ms", goalId: "g1", title: "M1" }] } },
    });

    window.dispatchEvent(
      new CustomEvent("offline:idmap", {
        detail: {
          tempId: "tmp_ms",
          real: { id: "m1", goalId: "g1", title: "M1" },
          url: "/api/goals/g1/milestones",
        },
      })
    );

    const state = useGoalsStore.getState();
    expect(state.goals[0].milestones).toEqual([{ id: "m1", goalId: "g1", title: "M1" }]);
    expect(state.goalById.g1.milestones).toEqual([{ id: "m1", goalId: "g1", title: "M1" }]);
  });
});
