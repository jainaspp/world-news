/**
 * 錯誤追蹤（客户端 → Worker 上報，生產環境建議換 Sentry）
 */
const WORKER_BASE = (import.meta.env.VITE_WORKER_BASE_URL as string)
  || 'https://world-news-api.jainaspp.workers.dev';

export interface ErrorReport {
  message: string; stack?: string; componentStack?: string;
  userAgent: string; url: string; timestamp: string; version: string;
}

export function reportError(err: unknown, ctx: Record<string,unknown> = {}) {
  const report: ErrorReport = {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    userAgent: navigator.userAgent, url: location.href,
    timestamp: new Date().toISOString(), version: '2.0.0', ...ctx,
  };
  if (navigator.sendBeacon) {
    navigator.sendBeacon(`${WORKER_BASE}/error`, JSON.stringify(report));
  }
  console.error('[世界頭條 Error]', report);
}
