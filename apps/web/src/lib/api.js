import axios from "axios";
import {
  initOfflineRuntime,
  isMutation,
  isNetworkError,
  enqueueWrite,
  syntheticQueuedResponse,
  readCachedGet,
  writeCachedGet,
} from "./offline";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

// Silent refresh on 401. Skip the refresh path itself to avoid an infinite loop
// when the refresh token is also expired/invalid.
api.interceptors.response.use(
  (r) => {
    // Cache successful GETs so they can be served on a future offline load.
    if ((r.config?.method || "get").toLowerCase() === "get" && !r.config?._offlineReplay) {
      writeCachedGet(r.config, r.data);
    }
    return r;
  },
  async (err) => {
    const url = err.config?.url || "";
    const isRefreshing = url.includes("/api/auth/refresh");
    const isAuthEntry = url.includes("/api/auth/login") || url.includes("/api/auth/register");

    if (
      err.response?.status === 401 &&
      !err.config._retried &&
      !isRefreshing &&
      !isAuthEntry
    ) {
      err.config._retried = true;
      try {
        await api.post("/api/auth/refresh");
        return api(err.config);
      } catch {
        return Promise.reject(err);
      }
    }

    // Offline handling: only kicks in for genuine network failures (no
    // response object) and never for the auth entry/refresh paths — those
    // need to fail loud so the login flow can react.
    if (isNetworkError(err) && !isAuthEntry && !isRefreshing && !err.config?._offlineReplay) {
      const method = (err.config?.method || "get").toLowerCase();
      if (method === "get") {
        const cached = readCachedGet(err.config);
        if (cached !== undefined) {
          return {
            data: cached,
            status: 200,
            statusText: "OK (cached)",
            headers: {},
            config: err.config,
            _fromCache: true,
          };
        }
      } else if (isMutation(method)) {
        enqueueWrite(err.config);
        return syntheticQueuedResponse(err.config);
      }
    }

    return Promise.reject(err);
  }
);

if (typeof window !== "undefined") {
  initOfflineRuntime(api);
}

export default api;
