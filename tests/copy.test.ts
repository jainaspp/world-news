import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** User-facing copy. Prompts in content.ts and focus.ts name banned particles on purpose and stay out of this scan. */
const FILES = [
  'shared/siteNav.ts',
  'shared/sitePages.ts',
  'shared/contentPage.ts',
  'shared/prose.ts',
  'shared/homeCopy.ts',
  'shared/homeIntro.ts',
  'shared/homePage.ts',
  'shared/homeTemplate.ts',
  'shared/i18n.ts',
  'shared/majorPage.ts',
  'shared/contact.ts',
  'shared/dataPage.ts',
  'shared/todayPage.ts',
  'shared/storyPage.ts',
  'src/components/HkInfoStrip.tsx',
];

const PARTICLES = /我哋|嘅|喺|咗|點樣|决|嘢|咁|同埋|呢個|呢啲|呢|唔|冇|仲未|撳|睇/g;
/** 關係、係數、系統、系列 stay legal. */
const BARE_HAI = /(?<![關係干])係(?![數統列])/g;

describe('formal written Chinese in user-facing copy', () => {
  it('scans templates for Cantonese particles', () => {
    const hits: string[] = [];
    for (const file of FILES) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(PARTICLES)) {
        hits.push(`${file}: ${match[0]}`);
      }
      for (const match of text.matchAll(BARE_HAI)) {
        hits.push(`${file}: ${match[0]}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
