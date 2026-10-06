export function applyRuntimeEnv(env: object | undefined): void {
  if (!env) return;
  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== 'string' || value.length === 0) continue;
    if (process.env[key]) continue;
    process.env[key] = value;
  }
}
