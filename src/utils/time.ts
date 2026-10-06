export function timeAgo(dateStr: string, now = Date.now()): string {
  const published = new Date(dateStr).getTime();
  if (!dateStr || Number.isNaN(published)) return '';
  const diff = now - published;
  if (diff < 0) return '';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 日前`;
  const date = new Date(published);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
