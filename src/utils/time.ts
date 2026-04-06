export function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) {
      const mins = Math.floor(diff / 60_000);
      return mins < 1 ? '剛剛' : `${mins} 分钟前`;
    }
    if (hours < 24) return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
  } catch {
    return '';
  }
}
