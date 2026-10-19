import { esc } from '../contentPage.js';

/**
 * Homepage monitoring reading.
 * Static editorial figures only. Do not import the future module from here,
 * and do not let this copy into that module's published text.
 * No second hand, no timer, no red scare line.
 */
export const MONITOR_READING = {
  minutes: 1,
  seconds: 29,
  asOf: '2025-01-28',
  note: '此為編輯寫定的監測刻度，對照公開公報，並不逐秒走動。',
} as const;

export function renderBulletinClock(): string {
  const { minutes, seconds, asOf, note } = MONITOR_READING;
  const second = String(seconds).padStart(2, '0');
  return `<section class="bulletin-clock" id="monitor" aria-label="監測讀數">
    <p class="bulletin-kicker">監測</p>
    <p class="bulletin-face" aria-label="距午夜 ${minutes} 分 ${second} 秒"><span class="bulletin-minutes"><span class="bulletin-num">${minutes}</span><span class="bulletin-unit">分</span></span><span class="bulletin-seconds"><span class="bulletin-sec">${second}</span><span class="bulletin-unit">秒</span></span></p>
    <p class="bulletin-asof">資料日期 <time datetime="${asOf}">${esc(asOf)}</time></p>
    <p class="bulletin-caption">${esc(note)}</p>
    <p class="bulletin-link"><a href="/civilization/#future">展望見文明總覽</a></p>
  </section>`;
}
