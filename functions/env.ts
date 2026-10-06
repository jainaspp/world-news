export interface PagesContext {
  request: Request;
  env: Record<string, unknown>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
}

export function edgeCache(): Cache | null {
  try {
    const storage = caches as CacheStorage & { default?: Cache };
    return storage.default ?? null;
  } catch {
    return null;
  }
}
