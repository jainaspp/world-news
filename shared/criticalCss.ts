/**
 * Above-the-fold CSS for story, briefing, and explainer documents.
 * The loader matches the open homepage/civilization work in PR #238
 * (`afterLcpBootstrap`, `parkNonLcpImages`): full stylesheets are injected
 * only after the LCP entry, because a print-media stylesheet still downloads
 * during parse and Lantern charges that download to LCP.
 * Homepage and 開蒙 shells do not call this module.
 */
export const ARTICLE_CRITICAL_CSS = `
:root {
  color-scheme: light;
  --color-primary: #1d4f91;
  --color-breaking: #c8102e;
  --color-bg: #f4f6f8;
  --color-surface: #ffffff;
  --color-text: #142033;
  --color-muted: #3d4c5f;
  --color-line: #d5dce6;
  --chip-border: #6b7789;
  --color-chip: #e7edf5;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-7: 48px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 999px;
  --font-sans: "Noto Sans TC", "WN Sans FB", "PingFang HK", "PingFang TC", "Microsoft JhengHei", sans-serif;
  --font-serif: "Noto Serif TC", "WN Serif FB", "Songti TC", "PMingLiU", serif;
  --main-col: 812px;
  --bg: var(--color-bg);
  --card: var(--color-surface);
  --text: var(--color-text);
  --muted: var(--color-muted);
  --line: var(--color-line);
  --accent: var(--color-primary);
  --accent-ink: #ffffff;
  --chip: var(--color-chip);
}
html.dark {
  color-scheme: dark;
  --color-bg: #0e141c;
  --color-surface: #17202b;
  --color-text: #f3f6fa;
  --color-muted: #c9d3df;
  --color-line: #2e3b4c;
  --chip-border: #9aabbf;
  --color-chip: #243140;
  --color-primary: #9ec0ef;
  --accent-ink: #0e141c;
  --bg: var(--color-bg);
  --card: var(--color-surface);
  --text: var(--color-text);
  --muted: var(--color-muted);
  --line: var(--color-line);
  --accent: var(--color-primary);
  --chip: var(--color-chip);
}
@font-face {
  font-family: "WN Sans FB";
  src: local("PingFang HK"), local("PingFang TC"), local("Microsoft JhengHei");
  size-adjust: 100%;
  ascent-override: 95%;
  descent-override: 22%;
  line-gap-override: 0%;
}
@font-face {
  font-family: "WN Serif FB";
  src: local("Songti TC"), local("PMingLiU"), local("Noto Serif CJK TC");
  size-adjust: 100%;
  ascent-override: 95%;
  descent-override: 22%;
  line-gap-override: 0%;
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body { background: var(--bg); color: var(--text); font-family: var(--font-sans); font-size: 16px; line-height: 1.5; }
img { max-width: 100%; height: auto; }
a { color: var(--accent); }
button, input { font: inherit; color: inherit; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.skip-link { position: absolute; left: 12px; top: -40px; }
.page { width: min(100% - 32px, var(--main-col)); margin: 0 auto; padding: 0 0 var(--space-7); }
.chrome { min-height: 96px; }
.masthead { display: flex; align-items: center; gap: 8px; min-height: 52px; }
.masthead-title { margin: 0; line-height: 1; flex: none; }
.logo-link { display: flex; align-items: center; min-height: 40px; text-decoration: none; color: inherit; }
.logo-link img { height: 36px; width: auto; }
.logo-link .logo-compact, .logo-link .logo-dark { display: none; }
.search-bar { position: relative; flex: 1; min-width: 0; display: flex; align-items: center; }
.search-bar > .search-toggle { display: none; }
.header-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.header-actions .icon-btn { min-width: 44px; min-height: 44px; }
.tab-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.civ-nav { display: flex; flex-wrap: wrap; gap: 8px; }
.chip, .icon-btn, .primary {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 40px; min-width: 40px; padding: 6px 12px;
  border-radius: var(--radius-pill); border: 1px solid var(--chip-border);
  background: var(--card); color: inherit; text-decoration: none;
}
.badge, .ai-badge {
  display: inline-flex; align-items: center;
  background: var(--accent); color: var(--accent-ink);
  border-radius: var(--radius-pill); padding: 2px 8px;
  font-size: 0.8rem; font-weight: 700; line-height: 1.4;
}
.layout { display: grid; gap: 16px; margin-top: 16px; }
.column-main { display: grid; gap: 16px; align-content: start; min-width: 0; }
.story {
  display: grid; gap: 0; background: var(--card); border: 1px solid var(--line);
  border-radius: var(--radius-lg); overflow: hidden; min-width: 0;
}
.story-media {
  display: block; width: 100%; aspect-ratio: 16 / 9; max-height: 220px;
  overflow: hidden; background: var(--chip);
}
.thumb, .thumb-fallback {
  display: block; width: 100%; height: 100%; max-height: 220px;
  object-fit: cover; background: var(--chip);
}
.thumb-fallback { display: flex; align-items: center; justify-content: center; }
.story-body { display: grid; gap: 6px; padding: 12px 16px 16px; align-content: start; }
.story-kicker, .story-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; color: var(--muted); font-size: 0.92rem; }
.kicker-region { font-weight: 700; color: var(--text); font-size: 13px; }
.story-title, .column-title {
  margin: 0; font-family: var(--font-serif); font-weight: 700;
  font-size: clamp(1.35rem, 2.4vw, 1.85rem); line-height: 1.32;
}
.story-hero .story-title { font-size: clamp(1.35rem, 2.4vw, 1.85rem); line-height: 1.32; }
.column-hero.pack-shell .column-title { font-size: 28px; line-height: 1.35; min-height: 1.35em; }
/* English explainer H1 is three 28px lines (~113px) until live-translate shortens it. */
.column-hero.pack-shell .story-title.title-reserve { min-height: 113px; }
.dek { margin: 0; color: var(--muted); font-size: 1.02rem; line-height: 1.6; min-height: 1.6em; }
.column-hero.pack-shell .dek { font-size: 15px; line-height: 1.55; min-height: 1.55em; }
.index-title-row { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px 10px; }
.index-title-row .story-kicker { margin: 0; }
.column-h2 { margin: 0; font-family: var(--font-serif); font-size: 18px; line-height: 1.4; }
.timeline { list-style: none; margin: 4px 0 0; padding: 0; display: grid; }
.timeline li {
  display: grid; grid-template-columns: 92px 14px minmax(0, 1fr);
  gap: 8px; align-items: start; padding-bottom: 12px;
}
.timeline time { color: var(--muted); font-size: 0.85rem; }
.tl-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); margin-top: 6px; }
.tl-body { font-size: 0.92rem; line-height: 1.5; }
.source-list { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 6px; }
.source-list a { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 4px 8px; color: inherit; text-decoration: none; font-size: 0.92rem; }
.pack-shell .ai-badge { font-size: 12px; line-height: 1.3; padding: 1px 6px; }
.ad-slot { display: block; width: 100%; }
.app-footer { margin-top: 24px; color: var(--muted); font-size: 0.95rem; }
.notice { color: var(--muted); }
.share-buttons, .story-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.listen {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-height: 44px;
}
.listen[hidden] { display: flex !important; }
.favicon { width: 16px; height: 16px; }
@media (max-width: 700px) {
  /* QA mobile (~390px layout): .chrome grew 104→178 when site.css painted the weather row. */
  .chrome { min-height: 178px; }
  .chrome > .hk-info {
    display: flex; align-items: center; flex-wrap: wrap; box-sizing: border-box;
    min-height: 40px; margin: 4px 0 0; padding: 4px 12px;
    background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-lg);
    font-size: 0.9rem; line-height: 1.4;
  }
  .chrome > .hk-info[hidden] { display: flex !important; }
  .masthead { min-height: 44px; flex-wrap: wrap; }
  .logo-link .logo-full { display: none !important; }
  .logo-link .logo-compact.logo-light { display: block; }
  html.dark .logo-link .logo-compact.logo-light { display: none !important; }
  html.dark .logo-link .logo-compact.logo-dark { display: block !important; }
  .logo-link img { height: 28px; }
  .search-bar { flex: none; }
  .search-bar > .search-toggle { display: inline-flex; min-height: 44px; min-width: 44px; }
  .search-bar input { display: none; }
  .layout { margin-top: 4px; gap: 8px; }
  .chrome > .tab-bar {
    flex-wrap: nowrap; align-items: center; gap: 8px; min-width: 0; padding: 8px 0;
  }
  .chrome .chip-scroller {
    display: flex; flex: 1 1 0%; width: 0; min-width: 0; overflow: hidden; align-items: center;
  }
  .chrome .chip-scroller .civ-nav { flex-wrap: nowrap; width: max-content; gap: 8px; }
  .chrome .civ-nav .chip, .chrome .nav-more > summary {
    min-width: 44px; min-height: 44px; padding: 3px 8px; font-size: 13px;
  }
  .chrome .nav-more > summary {
    display: inline-flex; align-items: center; justify-content: center;
    border: 1px solid var(--chip-border); border-radius: var(--radius-pill); background: var(--card);
  }
  .column-title { min-height: 56px; }
  .column-hero.pack-shell .column-title,
  .pack-article .column-title { font-size: 20px; line-height: 28px; min-height: 56px; }
  .column-hero.pack-shell .dek,
  .pack-article .dek { font-size: 15px; line-height: 24px; min-height: 24px; }
  .pack-toolbar { display: flex; align-items: center; height: 36px; max-height: 36px; overflow: hidden; }
  .pack-toolbar .listen { min-height: 32px; height: 32px; }
  .page.column-page[data-kind="compare"] .timeline[data-timeline="scroll"],
  .page.column-page[data-kind="briefing"] .timeline[data-timeline="scroll"],
  .page.column-page[data-kind="story"] .timeline[data-timeline="scroll"] {
    display: flex; gap: 64px; align-items: flex-start; overflow-x: auto;
    overscroll-behavior-x: contain; margin: 0; padding: 0 0 4px;
  }
  .page.column-page[data-kind="compare"] .timeline[data-timeline="scroll"] li,
  .page.column-page[data-kind="briefing"] .timeline[data-timeline="scroll"] li,
  .page.column-page[data-kind="story"] .timeline[data-timeline="scroll"] li {
    position: relative; display: flex; flex-direction: column; align-items: center;
    flex: 0 0 auto; min-width: 44px; max-width: 148px; margin: 0; padding: 0;
    border: 0; background: transparent;
  }
  .page.column-page[data-kind="compare"] .timeline[data-timeline="scroll"] .tl-dot,
  .page.column-page[data-kind="briefing"] .timeline[data-timeline="scroll"] .tl-dot,
  .page.column-page[data-kind="story"] .timeline[data-timeline="scroll"] .tl-dot {
    width: 44px; height: 48px; margin: 0; background: transparent; border-radius: 0;
  }
  .timeline[data-timeline="scroll"] li .tl-dot::after { content: none; }
}
.ig-deck, .ig-card, .ig-body-part, .ig-extra { display: contents; }
.ig-points, .ig-dots, .ig-close-only { display: none; }
@media (max-width: 768px) {
  .page.column-page[data-kind="compare"]:has(.ig-deck),
  .page.column-page[data-kind="briefing"]:has(.ig-deck),
  .page.column-page[data-kind="story"]:has(.ig-deck) {
    width: 100%; max-width: none; height: 100dvh; margin: 0; padding: 0;
    overflow: hidden; display: flex; flex-direction: column;
  }
  .page.column-page[data-kind="compare"]:has(.ig-deck) > .app-footer,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) > .app-footer,
  .page.column-page[data-kind="story"]:has(.ig-deck) > .app-footer,
  .page.column-page[data-kind="compare"]:has(.ig-deck) .sidebar,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .sidebar,
  .page.column-page[data-kind="story"]:has(.ig-deck) .sidebar { display: none; }
  .page.column-page[data-kind="compare"]:has(.ig-deck) .layout,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .layout,
  .page.column-page[data-kind="story"]:has(.ig-deck) .layout,
  .page.column-page[data-kind="compare"]:has(.ig-deck) .column-main,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .column-main,
  .page.column-page[data-kind="story"]:has(.ig-deck) .column-main {
    flex: 1 1 auto; min-height: 0; margin: 0; display: flex; flex-direction: column; overflow: hidden; gap: 0;
  }
  .page.column-page[data-kind="compare"]:has(.ig-deck) .ig-deck,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .ig-deck,
  .page.column-page[data-kind="story"]:has(.ig-deck) .ig-deck {
    display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; height: 100%;
    overflow-y: auto; scroll-snap-type: y mandatory; scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain;
  }
  .page.column-page[data-kind="compare"]:has(.ig-deck) .ig-card,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .ig-card,
  .page.column-page[data-kind="story"]:has(.ig-deck) .ig-card {
    display: grid; align-content: center; position: relative; box-sizing: border-box;
    flex: 0 0 auto; width: 100%; min-height: 100dvh;
    scroll-snap-align: start; scroll-snap-stop: always;
    padding: max(72px, env(safe-area-inset-top)) 20px calc(88px + env(safe-area-inset-bottom));
  }
  .page.column-page[data-kind="compare"]:has(.ig-deck) .pack-body:has(.ig-body-part),
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .pack-body:has(.ig-body-part) { display: contents; }
  .page.column-page[data-kind="compare"]:has(.ig-deck) .ig-card-lead,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .ig-card-lead,
  .page.column-page[data-kind="story"]:has(.ig-deck) .ig-card-lead { order: 1; }
  .page.column-page[data-kind="compare"]:has(.ig-deck) .ig-card-timeline,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .ig-card-timeline,
  .page.column-page[data-kind="story"]:has(.ig-deck) .ig-card-timeline { order: 2; }
  .page.column-page[data-kind="compare"]:has(.ig-deck) .ig-card-body,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .ig-card-body { order: 3; }
  .page.column-page[data-kind="compare"]:has(.ig-deck) .ig-card-sources,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .ig-card-sources,
  .page.column-page[data-kind="story"]:has(.ig-deck) .ig-card-sources { order: 4; }
  .page.column-page[data-kind="compare"]:has(.ig-deck) .ig-card-close,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .ig-card-close,
  .page.column-page[data-kind="story"]:has(.ig-deck) .ig-card-close { order: 5; }
  .page.column-page[data-kind="compare"]:has(.ig-deck) .ig-deck > #ad-mid,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .ig-deck > #ad-mid { display: none !important; }
  .page.column-page[data-kind="compare"]:has(.ig-deck) .ig-deck > .ig-extra,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .ig-deck > .ig-extra {
    display: block; order: 6; scroll-snap-align: none; padding: 24px 20px 88px;
  }
  .ig-points { display: grid; gap: 12px; list-style: none; margin: 12px 0 0; padding: 0; }
  .ig-points li {
    background: var(--card); border: 1px solid var(--line); border-left: 3px solid var(--accent);
    border-radius: 10px; padding: 12px 14px; font-size: 15px; line-height: 1.5;
  }
  .ig-dots {
    position: fixed; right: 10px; top: 50%; transform: translateY(-50%); z-index: 40;
    display: grid; gap: 8px; pointer-events: none;
  }
  .ig-dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--line); display: block; }
  .ig-dots i.on { background: var(--accent); }
  .ig-close-only { display: grid; gap: 12px; }
  .ig-kicker { margin: 0; font-size: 12px; letter-spacing: 0.12em; color: var(--accent); font-weight: 700; }
  .ig-card::after {
    content: "↑ 上滑"; position: absolute; left: 0; right: 28px;
    bottom: max(18px, env(safe-area-inset-bottom)); text-align: center;
    font-size: 12px; line-height: 1.4; color: var(--muted); pointer-events: none;
  }
  .ig-card-close::after { content: none; }
  .ig-card .story, .ig-card .pack-sources, .ig-card .timeline-card { background: transparent; border: 0; box-shadow: none; }
}
@media (max-width: 768px) and (prefers-reduced-motion: reduce) {
  .page.column-page[data-kind="compare"]:has(.ig-deck) .ig-deck,
  .page.column-page[data-kind="briefing"]:has(.ig-deck) .ig-deck,
  .page.column-page[data-kind="story"]:has(.ig-deck) .ig-deck { scroll-behavior: auto; }
}
`.replace(/\n+/g, '\n').trim();

export function criticalStyleTag(css = ARTICLE_CRITICAL_CSS): string {
  return `<style id="wn-critical">${css}</style>`;
}

export interface LcpTail {
  stylesheets: string[];
  scripts?: string[];
  moduleSrc?: string;
  fonts?: string;
  /** Wait until this image has decoded, then one frame, before secondary requests. */
  imageId?: string;
  /** Set crossorigin on secondary scripts. Used for the ad loader only. */
  scriptCrossOrigin?: boolean;
}

/**
 * Secondary CSS, scripts, fonts and parked images start after the LCP paint.
 * Scripts run in order so an ad loader is in the document before columns.js
 * looks for it. A print-media stylesheet still downloads during parse, and on
 * a fast machine that download finishes before the paint, so Lantern charges it to LCP.
 */
export function afterLcpBootstrap(options: LcpTail): string {
  const payload = JSON.stringify({
    stylesheets: options.stylesheets,
    scripts: options.scripts ?? [],
    moduleSrc: options.moduleSrc ?? '',
    fonts: options.fonts ?? '',
    imageId: options.imageId ?? '',
    scriptCrossOrigin: options.scriptCrossOrigin === true,
  });
  return `<script id="wn-lcp-boot">(function(){var cfg=${payload};var started=false;function load(){if(started)return;started=true;cfg.stylesheets.forEach(function(href){var l=document.createElement("link");l.rel="stylesheet";l.href=href;document.head.appendChild(l)});document.querySelectorAll("source[data-srcset]").forEach(function(node){node.srcset=node.getAttribute("data-srcset")});document.querySelectorAll("img[data-src]").forEach(function(img){var set=img.getAttribute("data-srcset");var sizes=img.getAttribute("data-sizes");if(set)img.srcset=set;if(sizes)img.sizes=sizes;img.src=img.getAttribute("data-src")});var i=0;function next(){if(i>=cfg.scripts.length)return;var s=document.createElement("script");s.src=cfg.scripts[i];i+=1;if(cfg.scriptCrossOrigin)s.crossOrigin="anonymous";s.onload=s.onerror=function(){next()};document.body.appendChild(s)}next();if(cfg.moduleSrc){var m=document.createElement("script");m.type="module";m.crossOrigin="anonymous";m.src=cfg.moduleSrc;document.body.appendChild(m)}if(cfg.fonts){var fonts=cfg.fonts;function addFonts(){setTimeout(function(){var f=document.createElement("link");f.rel="stylesheet";f.href=fonts;document.head.appendChild(f)},8000)}if(document.readyState==="complete")addFonts();else window.addEventListener("load",addFonts)}}function later(fn){requestAnimationFrame(function(){requestAnimationFrame(fn)})}function afterEntry(match){var timer=0;var armed=false;function go(){if(armed)return;clearTimeout(timer);timer=setTimeout(function(){if(armed)return;armed=true;later(load)},300)}try{var po=new PerformanceObserver(function(list){var entries=list.getEntries();for(var n=0;n<entries.length;n++){if(!match||match(entries[n]))go()}});po.observe({type:"largest-contentful-paint",buffered:true})}catch(e){go()}setTimeout(function(){if(armed)return;armed=true;load()},4000)}var img=cfg.imageId&&document.getElementById(cfg.imageId);if(img&&img.complete&&img.naturalWidth===0)afterEntry(null);else if(img){img.addEventListener("error",function(){afterEntry(null)}),afterEntry(function(entry){return entry.element===img})}else afterEntry(null)})();</script>`;
}

/**
 * Keep every image except the LCP file out of the preload scanner.
 * The original tag stays inside noscript for readers without JavaScript.
 */
export function parkNonLcpImages(html: string): string {
  const sources = html.replace(/<source\b[^>]*>/g, (tag) => (
    tag.includes('data-srcset=') ? tag : tag.replace(/\ssrcset="/, ' data-srcset="')
  ));
  return sources.replace(/<img\b[^>]*>/g, (tag) => {
    if (tag.includes('id="wn-lcp"') || tag.includes('data-src=')) return tag;
    if (!/\ssrc="/.test(tag)) return tag;
    const parked = tag
      .replace(/\ssrcset="/, ' data-srcset="')
      .replace(/\ssizes="/, ' data-sizes="')
      .replace(/\ssrc="/, ' data-src="');
    return `${parked}<noscript>${tag}</noscript>`;
  });
}
