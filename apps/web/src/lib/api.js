import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

// Silent refresh on 401. Skip the refresh path itself to avoid an infinite loop
// when the refresh token is also expired/invalid.
api.interceptors.response.use(
  (r) => r,
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
    return Promise.reject(err);
  }
);

export default api;
