import { AsyncLocalStorage } from "node:async_hooks";

/*
 * Outside `next dev` / `next start` there is no data cache, and unstable_cache throws
 * ("incrementalCache missing"). Import this to give it a cache that never hits, so cached
 * public reads (the AI Lodge feed, site links, photos) run straight against the database.
 * Next's server sets globalThis.AsyncLocalStorage itself; plain Node needs it set here.
 */
const g = globalThis as { __incrementalCache?: unknown; AsyncLocalStorage?: unknown };
g.AsyncLocalStorage ??= AsyncLocalStorage;
g.__incrementalCache = {
  isOnDemandRevalidate: false,
  generateSimpleCacheKey: async (key: string) => key,
  get: async () => null,
  set: async () => undefined,
};
