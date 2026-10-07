import { esc } from './contentPage.js';
import { HOME_INTRO, HOME_INTRO_LINE, HOME_SECTIONS } from './homeCopy.js';

/** Full intro plus the column list. Server-rendered, including inside the collapsed toggle. */
export function homeIntroBody(): string {
  const items = HOME_SECTIONS.map((section) => (
    `<li><strong><a href="${esc(section.href)}">${esc(section.name)}</a></strong> ${esc(section.text)}</li>`
  )).join('');
  return `<p>${esc(HOME_INTRO)}</p><ul class="home-sections">${items}</ul>`;
}

export function homeIntroTop(): string {
  return `<section class="home-intro home-intro-top" aria-label="關於世界頭條"><p class="home-intro-line">${esc(HOME_INTRO_LINE)}</p><details class="home-more"><summary>了解更多</summary>${homeIntroBody()}</details></section>`;
}

export function homeIntroFoot(): string {
  return `<section class="home-intro home-intro-foot" aria-label="關於世界頭條"><h2>關於世界頭條</h2>${homeIntroBody()}</section>`;
}
