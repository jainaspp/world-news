export function safeUrl(link: string): string {
  try {
    const url = new URL(link);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
  } catch {
    /* ignore */
  }
  return '';
}
