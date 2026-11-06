import { esc } from '../contentPage.js';
import { renderThreadArticle } from './db/render.js';
import { type EarthStage } from './content/earthStages.js';

export {
  EARTH_HANDOFF,
  EARTH_LEDE,
  EARTH_LINES,
  EARTH_MIN_CHARS,
  EARTH_SOURCE_NOTE,
  EARTH_SOURCES,
  EARTH_STAGES,
  EARTH_TITLE,
  earthIndexable,
  earthProse,
  earthStageHref,
  earthStageText,
} from './content/earthStages.js';
export type { EarthLine, EarthPart, EarthSource, EarthStage } from './content/earthStages.js';

const CIV = '/static/civilization';

export function earthCoverImg(stage: EarthStage, eager: boolean): string {
  const base = `${CIV}/earth-stage-${stage.n}-cover`;
  const loading = eager ? 'eager' : 'lazy';
  const priority = eager ? ' fetchpriority="high"' : '';
  const alt = `${stage.name}：溫和示意，年代為約數`;
  return `<img src="${base}-640w.webp" srcset="${base}-400w.webp 400w, ${base}-640w.webp 640w, ${base}-1280w.webp 1280w" sizes="(max-width: 640px) 100vw, 400px" width="640" height="400" alt="${esc(alt)}" loading="${loading}"${priority} decoding="async" onerror="this.hidden=true" />`;
}


export function renderEarthArticle(): string {
  return renderThreadArticle('earth');
}
