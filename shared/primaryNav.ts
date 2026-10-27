/**
 * Primary channel row: 文明｜編年｜今天｜開蒙.
 * `civ-chip` is only the current 文明 pill, so a later chrome pass can keep
 * `.chip.civ-chip` as the filled/underlined current state (T8 #287 tip
 * `0f844a8` underlines every `.masthead .chip.civ-chip`).
 * `/` and civilization pages highlight 文明. Briefing highlights 今天 in this
 * row, while 導讀 stays the aria-current page inside 更多. Chronicle
 * highlights 編年. Learn highlights 開蒙.
 */
export type PrimaryKey = 'civilization' | 'chronicle' | 'today' | 'learn';

export function primaryKeyFor(active: string): PrimaryKey | '' {
  if (active === 'chronicle') return 'chronicle';
  if (active === 'civilization') return 'civilization';
  if (active === 'learn') return 'learn';
  if (active === 'briefing') return 'today';
  if (active === 'home') return 'civilization';
  return '';
}

export function primaryChipClass(current: PrimaryKey | '', key: PrimaryKey): string {
  const on = current === key;
  const parts = ['chip'];
  if (on && key === 'civilization') parts.push('civ-chip');
  if (on) parts.push('active');
  return parts.join(' ');
}

/** aria-current="page" only when this pill is the document, not a related cue. */
export function primaryAriaCurrent(active: string, key: PrimaryKey): boolean {
  if (active === 'briefing' && key === 'today') return false;
  return primaryKeyFor(active) === key;
}

export function primaryNavHtml(active: string): string {
  const current = primaryKeyFor(active);
  const item = (href: string, label: string, key: PrimaryKey) => {
    const aria = primaryAriaCurrent(active, key) ? ' aria-current="page"' : '';
    return `<a class="${primaryChipClass(current, key)}" href="${href}"${aria}>${label}</a>`;
  };
  return `<nav class="civ-nav" aria-label="主欄目">${item('/civilization/', '文明', 'civilization')}${item('/civilization/chronicle/', '編年', 'chronicle')}${item('/#slice', '今天', 'today')}${item('/learn/', '開蒙', 'learn')}</nav>`;
}
