/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that env var is set. */
export function isCronAuthorized(authorization: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return authorization === `Bearer ${secret}`;
}
