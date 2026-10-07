/** Gentle idle-motion class for a weather emoji. Empty when there is no icon. */
export function wxIconClass(emoji: string): string {
  if (!emoji) return '';
  if (emoji.includes('⛈')) return 'wx-icon wx-icon-storm';
  if (emoji.includes('🌧') || emoji.includes('🌦')) return 'wx-icon wx-icon-rain';
  if (emoji.includes('🌨') || emoji.includes('🥶')) return 'wx-icon wx-icon-snow';
  if (emoji.includes('☁') || emoji.includes('⛅') || emoji.includes('🌫')) return 'wx-icon wx-icon-cloud';
  if (emoji.includes('☀') || emoji.includes('🌤') || emoji.includes('🥵')) return 'wx-icon wx-icon-sun';
  return 'wx-icon wx-icon-idle';
}
