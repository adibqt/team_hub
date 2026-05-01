/**
 * Offline support — GET cache + write queue.
 *
 * Mutations that fail with a network error while offline are appended to a
 * persisted queue and "succeed" locally so the existing optimistic UI keeps
 * its state. When the browser comes back online the queue replays in order
 * against the real API. Successful POST replays emit an `offline:idmap`
 * event so stores can swap optimistic `tmp_*` ids for the canonical ones.
 *
 * Queue replay rewrites `tmp_*` ids in the URL/body of later requests using
 * a tempId → realId map populated as earlier POSTs resolve. This lets a user
 * create a goal offline and then update it before the original POST has been
 * confirmed.
 */

const CACHE_KEY = "th_offline_cache_v1";
const QUEUE_KEY = "th_offline_queue_v1";

const listeners = new Set();
let online = typeof navigator === "undefined" ? true : navigator.onLine;
let replaying = false;

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readMap(key) {
  if (typeof window === "undefined") return {};
  return safeParse(window.localStorage.getItem(key), {});
}

function writeMap(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or serialization issue — drop silently; offline is best-effort.
  }
}

function readQueue() {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(QUEUE_KEY), []);
}

function writeQueue(queue) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* see writeMap */
  }
}

function notify() {
  for (const fn of listeners) {
    try {
      fn(getStatus());
    } catch {
      /* ignore listener errors */
    }
  }
}

export function getStatus() {
  return { online, queued: readQueue().length, replaying };
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(getStatus());
  return () => listeners.delete(fn);
}

/* ─────────────────────────  GET CACHE  ───────────────────────── */

function cacheKeyFor(config) {
  const url = config.url || "";
  const params = config.params ? JSON.stringify(config.params) : "";
  return `${url}?${params}`;
}

export function readCachedGet(config) {
  const map = readMap(CACHE_KEY);
  const entry = map[cacheKeyFor(config)];
  return entry ? entry.data : undefined;
}

export function writeCachedGet(config, data) {
  const map = readMap(CACHE_KEY);
  map[cacheKeyFor(config)] = { data, at: Date.now() };
  writeMap(CACHE_KEY, map);
}

export function clearCache() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CACHE_KEY);
}

/* ─────────────────────────  WRITE QUEUE  ───────────────────────── */

function isMutation(method) {
  const m = (method || "get").toLowerCase();
  return m === "post" || m === "put" || m === "patch" || m === "delete";
}

function isNetworkError(err) {
  // axios marks dropped requests with no `response`. Also covers fetch-style.
  return !!err && !err.response;
}

export function enqueueWrite(config) {
  const queue = readQueue();
  const entry = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    method: (config.method || "post").toLowerCase(),
    url: config.url,
    data: config.data,
    params: config.params,
    headers: stripAxiosHeaders(config.headers),
    enqueuedAt: Date.now(),
  };
  queue.push(entry);
  writeQueue(queue);
  notify();
  return entry;
}

function stripAxiosHeaders(headers) {
  if (!headers) return undefined;
  // Axios stuffs `common`, `get`, `post`, etc. into headers — keep only flat
  // string values to avoid serializing internal config.
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function rewriteTempIds(value, tempIdMap) {
  if (Object.keys(tempIdMap).length === 0) return value;
  if (typeof value === "string") {
    let next = value;
    for (const [tmp, real] of Object.entries(tempIdMap)) {
      if (next.includes(tmp)) next = next.split(tmp).join(real);
    }
    return next;
  }
  if (Array.isArray(value)) return value.map((v) => rewriteTempIds(v, tempIdMap));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = rewriteTempIds(v, tempIdMap);
    return out;
  }
  return value;
}

/**
 * Replay queued writes against the live api instance. Caller passes the
 * configured axios instance to avoid an import cycle.
 */
export async function replayQueue(api) {
  if (replaying) return;
  if (!online) return;
  const queue = readQueue();
  if (queue.length === 0) return;

  replaying = true;
  notify();

  const tempIdMap = {};

  while (true) {
    const current = readQueue();
    if (current.length === 0) break;
    const entry = current[0];

    const url = rewriteTempIds(entry.url, tempIdMap);
    const data = rewriteTempIds(entry.data, tempIdMap);

    // Drop entries that still reference an unmapped tmp_* id — they are
    // dependent on a POST that didn't make it through. Better to discard
    // than to send a bogus id to the server.
    if (typeof url === "string" && url.includes("/tmp_")) {
      writeQueue(current.slice(1));
      notify();
      continue;
    }

    try {
      const res = await api.request({
        method: entry.method,
        url,
        data,
        params: entry.params,
        headers: entry.headers,
        // Skip the offline interceptor's queueing path on replay.
        _offlineReplay: true,
      });

      // POSTs with an id in the response: record the mapping so subsequent
      // queued writes referencing the tmp_* id can be rewritten.
      const tmpIdInOriginal = extractTempId(entry);
      const realId = res?.data?.id;
      if (tmpIdInOriginal && realId && tmpIdInOriginal !== realId) {
        tempIdMap[tmpIdInOriginal] = realId;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("offline:idmap", {
              detail: { tempId: tmpIdInOriginal, real: res.data, url: entry.url },
            })
          );
        }
      }

      writeQueue(readQueue().slice(1));
      notify();
    } catch (err) {
      if (isNetworkError(err)) {
        // Lost connection mid-replay — stop, keep the entry, try again later.
        break;
      }
      // Server rejected the request (4xx/5xx). Drop it so we don't loop on
      // a permanently bad payload; surface via event for UI/toast handling.
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("offline:replay-failed", {
            detail: { entry, status: err.response?.status },
          })
        );
      }
      writeQueue(readQueue().slice(1));
      notify();
    }
  }

  replaying = false;
  notify();
}

function extractTempId(entry) {
  // Look for the first tmp_* substring in the URL or data — used to bind a
  // POST's response to a particular optimistic placeholder. POST URLs for
  // creates won't contain a tmp id; we fall back to scanning the body.
  const haystack = JSON.stringify({ url: entry.url, data: entry.data });
  const m = haystack.match(/tmp_[A-Za-z0-9_-]+/);
  return m ? m[0] : null;
}

/* ─────────────────────────  AXIOS HELPERS  ───────────────────────── */

/**
 * Build a synthetic response so a queued mutation looks "successful" to the
 * caller. We need `data.id` to match the optimistic record so post-success
 * logic like `items.map(i => i.id === id ? data : i)` remerges cleanly:
 *  - POST creates: id is the tmp_* placeholder embedded in the body.
 *  - PATCH/DELETE: id is the trailing path segment of the URL.
 * For PATCH we also spread the request body so the merged record reflects
 * the optimistic field changes (the caller already wrote them locally; this
 * keeps things consistent if they overwrite from `data`).
 */
export function syntheticQueuedResponse(config) {
  const method = (config.method || "post").toLowerCase();
  let id = extractTempId({ url: config.url, data: config.data });
  if (!id && typeof config.url === "string") {
    const segs = config.url.split("?")[0].split("/").filter(Boolean);
    id = segs[segs.length - 1] || null;
  }
  const data =
    method === "delete"
      ? { id, _queued: true }
      : { ...(config.data || {}), id, _queued: true };
  return {
    data,
    status: 202,
    statusText: "Queued (offline)",
    headers: {},
    config,
    _queued: true,
  };
}

/* ─────────────────────────  ONLINE WATCH  ───────────────────────── */

export function initOfflineRuntime(api) {
  if (typeof window === "undefined") return;
  if (window.__thOfflineInit) return;
  window.__thOfflineInit = true;

  const setOnline = (next) => {
    if (online === next) return;
    online = next;
    notify();
    if (next) {
      replayQueue(api).catch(() => {});
    }
  };

  window.addEventListener("online", () => setOnline(true));
  window.addEventListener("offline", () => setOnline(false));

  // First load: if already online, drain whatever may be queued from a
  // previous session.
  if (online) {
    replayQueue(api).catch(() => {});
  }
}

export { isMutation, isNetworkError };
