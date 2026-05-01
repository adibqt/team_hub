jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import api from "@/lib/api";
import { useAuthStore } from "../authStore";

beforeEach(() => {
  useAuthStore.setState({ user: null });
  jest.clearAllMocks();
  // Each test starts with a fresh "session" key so logout's cleanup is observable.
  window.localStorage.setItem("activeWsId", "ws-99");
});

describe("useAuthStore", () => {
  it("starts with no user", () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("setUser stores the user object", () => {
    const u = { id: "u1", name: "Alice" };
    useAuthStore.getState().setUser(u);
    expect(useAuthStore.getState().user).toBe(u);
  });

  it("clearUser drops the user back to null", () => {
    useAuthStore.getState().setUser({ id: "u1" });
    useAuthStore.getState().clearUser();
    expect(useAuthStore.getState().user).toBeNull();
  });

  describe("logout", () => {
    it("calls the logout endpoint, clears the user and the active workspace key", async () => {
      api.post.mockResolvedValue({ data: { ok: true } });
      useAuthStore.getState().setUser({ id: "u1" });

      await useAuthStore.getState().logout();

      expect(api.post).toHaveBeenCalledWith("/api/auth/logout");
      expect(useAuthStore.getState().user).toBeNull();
      expect(window.localStorage.getItem("activeWsId")).toBeNull();
    });

    it("still clears local state even if the network call fails", async () => {
      api.post.mockRejectedValue(new Error("offline"));
      useAuthStore.getState().setUser({ id: "u1" });

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
      expect(window.localStorage.getItem("activeWsId")).toBeNull();
    });
  });
});
