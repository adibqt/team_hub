jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

import api from "@/lib/api";
import { useNotificationsStore } from "../notificationsStore";

const RESET = { items: [], unreadCount: 0, loaded: false };

beforeEach(() => {
  useNotificationsStore.setState(RESET);
  jest.clearAllMocks();
});

describe("load", () => {
  it("populates items + unreadCount and flips loaded=true", async () => {
    api.get.mockResolvedValue({
      data: {
        items: [{ id: "n1", readAt: null }, { id: "n2", readAt: "2024-01-01" }],
        unreadCount: 1,
      },
    });

    const data = await useNotificationsStore.getState().load();

    expect(api.get).toHaveBeenCalledWith("/api/notifications");
    expect(data.unreadCount).toBe(1);
    expect(useNotificationsStore.getState().items).toHaveLength(2);
    expect(useNotificationsStore.getState().loaded).toBe(true);
  });
});

describe("pushNotification", () => {
  it("ignores notifications without an id", () => {
    useNotificationsStore.getState().pushNotification(null);
    useNotificationsStore.getState().pushNotification({});
    expect(useNotificationsStore.getState().items).toEqual([]);
  });

  it("inserts at the head and bumps unreadCount when readAt is null", () => {
    useNotificationsStore.getState().pushNotification({ id: "n1", readAt: null });
    useNotificationsStore.getState().pushNotification({ id: "n2", readAt: null });

    const { items, unreadCount } = useNotificationsStore.getState();
    expect(items.map((n) => n.id)).toEqual(["n2", "n1"]);
    expect(unreadCount).toBe(2);
  });

  it("doesn't bump unreadCount when the notification is already read", () => {
    useNotificationsStore.getState().pushNotification({ id: "n1", readAt: "2024-01-01" });
    expect(useNotificationsStore.getState().unreadCount).toBe(0);
  });

  it("dedupes by id", () => {
    useNotificationsStore.getState().pushNotification({ id: "n1", readAt: null });
    useNotificationsStore.getState().pushNotification({ id: "n1", readAt: null });
    expect(useNotificationsStore.getState().items).toHaveLength(1);
    expect(useNotificationsStore.getState().unreadCount).toBe(1);
  });

  it("caps the list at 50 entries", () => {
    for (let i = 0; i < 60; i++) {
      useNotificationsStore.getState().pushNotification({
        id: `n${i}`,
        readAt: "2024-01-01",
      });
    }
    expect(useNotificationsStore.getState().items).toHaveLength(50);
    // Most recent first → n59 is at index 0.
    expect(useNotificationsStore.getState().items[0].id).toBe("n59");
  });
});

describe("markRead", () => {
  it("optimistically marks read and decrements unreadCount", async () => {
    useNotificationsStore.setState({
      items: [{ id: "n1", readAt: null }],
      unreadCount: 1,
      loaded: true,
    });
    api.patch.mockResolvedValue({ data: {} });

    await useNotificationsStore.getState().markRead("n1");

    expect(api.patch).toHaveBeenCalledWith("/api/notifications/n1/read");
    expect(useNotificationsStore.getState().items[0].readAt).toBeTruthy();
    expect(useNotificationsStore.getState().unreadCount).toBe(0);
  });

  it("rolls back when the request fails", async () => {
    useNotificationsStore.setState({
      items: [{ id: "n1", readAt: null }],
      unreadCount: 1,
      loaded: true,
    });
    api.patch.mockRejectedValue(new Error("net"));

    await useNotificationsStore.getState().markRead("n1");

    expect(useNotificationsStore.getState().items[0].readAt).toBeNull();
    expect(useNotificationsStore.getState().unreadCount).toBe(1);
  });

  it("is a no-op for missing ids and already-read items", async () => {
    useNotificationsStore.setState({
      items: [{ id: "n1", readAt: "2024-01-01" }],
      unreadCount: 0,
      loaded: true,
    });

    await useNotificationsStore.getState().markRead("nope");
    await useNotificationsStore.getState().markRead("n1");

    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe("markAllRead", () => {
  it("does nothing when nothing is unread", async () => {
    await useNotificationsStore.getState().markAllRead();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("marks every unread item read on success", async () => {
    useNotificationsStore.setState({
      items: [
        { id: "n1", readAt: null },
        { id: "n2", readAt: "2024-01-01" },
        { id: "n3", readAt: null },
      ],
      unreadCount: 2,
      loaded: true,
    });
    api.post.mockResolvedValue({ data: {} });

    await useNotificationsStore.getState().markAllRead();

    const items = useNotificationsStore.getState().items;
    expect(items.every((n) => n.readAt)).toBe(true);
    expect(useNotificationsStore.getState().unreadCount).toBe(0);
    expect(api.post).toHaveBeenCalledWith("/api/notifications/read-all");
  });

  it("rolls back to the prior state when the network call rejects", async () => {
    const items = [
      { id: "n1", readAt: null },
      { id: "n2", readAt: null },
    ];
    useNotificationsStore.setState({ items, unreadCount: 2, loaded: true });
    api.post.mockRejectedValue(new Error("offline"));

    await useNotificationsStore.getState().markAllRead();

    expect(useNotificationsStore.getState().items).toBe(items);
    expect(useNotificationsStore.getState().unreadCount).toBe(2);
  });
});
