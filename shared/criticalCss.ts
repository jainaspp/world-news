/**
 * Above-the-fold CSS inlined on the homepage and the civilization hub.
 * The full stylesheet stays async so first paint does not wait on ~100KB.
 * Declarations that size the hero title and the axis vignette match src/App.css.
 */
export const CRITICAL_CSS = `
:root {
  color-scheme: light;
  --color-bg: #f4f6f8;
  --color-text: #142033;
  --color-primary: #1d4f91;
  --bg: var(--color-bg);
  --text: var(--color-text);
  --accent: var(--color-primary);
  --accent-ink: #ffffff;
  --font-sans: "Noto Sans TC", "PingFang HK", "PingFang TC", "Microsoft JhengHei", sans-serif;
  --font-serif: "Noto Serif TC", "Songti TC", "PMingLiU", serif;
  --main-col: 812px;
  --space-7: 48px;
  --brass-ink-fill: #a18256;
  --civ-type-kicker: 0.75rem;
  --civ-type-body: 0.875rem;
  --civ-type-display: clamp(1.7rem, 3vw, 2.2rem);
  --motion-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
* { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100%; }
body { background: var(--bg); color: var(--text); font-family: var(--font-sans); }
img { max-width: 100%; }
a { color: var(--accent); }
.skip-link { position: absolute; left: 12px; top: -40px; }
.page { width: min(100% - 32px, var(--main-col)); margin: 0 auto; padding: 0 0 var(--space-7); }
.ssr-home { padding-top: 12px; }
.wn-feed { display: contents; }
#chrome-mount { min-height: 111px; }
@media (max-width: 700px) {
  #chrome-mount { min-height: 161px; }
}
.civ-nav { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 0 2px; }
.chip {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; min-width: 44px; padding: 6px 12px;
  border-radius: 999px; text-decoration: none; color: inherit;
  border: 1px solid #6b7789; background: #fff;
}
.chip.civ-chip { background: #161c24; color: #f0ebe3; border-color: #161c24; font-weight: 700; }
.hero-opening {
  --era-ancient: #c4a572;
  --era-now: #9ec0ef;
  --era-future: #2a2140;
  position: relative;
  margin: 0 -16px;
  padding: 60px 20px 44px;
  min-height: clamp(430px, 84vh, 780px);
  min-height: clamp(430px, 84svh, 780px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  background: radial-gradient(130% 95% at 50% 38%, #1c2431 0%, #161c24 55%, #121820 100%);
  color: #e8e4dc;
  border-bottom: 1px solid color-mix(in srgb, var(--era-ancient) 35%, transparent);
  text-align: center;
}
.hero-opening + .axis-mount > .axis-hero,
.hero-opening + .axis-hero { margin-top: 0; }
.hero-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.hero-inner { position: relative; z-index: 1; width: min(100%, 620px); margin: 0 auto; }
.hero-kicker {
  margin: 0 0 6px; font-size: var(--civ-type-kicker); font-weight: 700;
  letter-spacing: 0.22em; color: var(--era-ancient); opacity: 1;
}
.hero-title {
  margin: 0 0 8px; font-family: var(--font-serif);
  font-size: clamp(2.9rem, 9vw, 3.6rem); line-height: 1.2; font-weight: 700; color: #f7f1e6; opacity: 1;
}
.hero-reading { margin: 0 0 8px; font-family: var(--font-serif); font-size: 1rem; color: #f7f1e6; }
.hero-lines {
  margin: 0 auto; max-width: 36em;
  font-size: 1rem; line-height: 1.45;
}
.hero-line { margin: 0 0 0.28rem; }
.hero-line .hero-main { display: block; color: #e8e4dc; }
.hero-line .hero-aside { display: block; margin-top: 0.05em; font-size: max(12px, 0.82em); color: #a8b0ba; }
.hero-opening[data-mode="playing"] .hero-line,
.hero-opening[data-mode="playing"] .hero-reading { opacity: 0; transform: translateY(8px); }
.hero-opening[data-mode="playing"] .hero-line[data-on="true"],
.hero-opening[data-mode="playing"] .hero-reading[data-on="true"] { opacity: 1; transform: none; }
.hero-cta { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 26px; }
.hero-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; padding: 10px 18px; border-radius: 999px;
  font-size: 0.95rem; font-weight: 700; text-decoration: none; border: 1px solid transparent;
}
.hero-btn-brass { background: var(--brass-ink-fill); color: #161c24; }
.hero-btn-ghost { background: transparent; color: #e8e4dc; border-color: rgba(232, 228, 220, 0.35); }
.hero-hint-row { margin: 8px 0 0; }
.hero-hint {
  display: inline-flex; align-items: center; min-height: 44px; padding: 6px 10px;
  color: #a8b0ba; font-size: 0.8rem; letter-spacing: 0.24em; text-decoration: none;
}
.hero-skip, .hero-replay {
  position: absolute; top: 10px; right: 16px; z-index: 2;
  min-height: 44px; min-width: 44px; padding: 8px 14px; border-radius: 999px;
  border: 1px solid rgba(232, 228, 220, 0.28); background: rgba(22, 28, 36, 0.55); color: #c5c0b6;
}
.hero-opening[data-mode="settled"] .hero-skip { display: none; }
.hero-opening[data-mode="playing"] .hero-replay { display: none; }
.hero-opening[data-mode="playing"] .hero-cta,
.hero-opening[data-mode="playing"] .hero-hint-row { opacity: 0; visibility: hidden; }
.axis-hero {
  position: relative; margin: 12px -16px 0; padding: 22px 16px 32px;
  background: #161c24; color: #e8e4dc; overflow: hidden; min-width: 0;
}
.axis-hero:not(.axis-slim) { min-height: 560px; }
.deep-axis { position: relative; max-width: none; margin-inline: -16px; padding: 8px 0 4px; overflow: visible; }
.milestones { display: flex; gap: 8px; list-style: none; margin: 0; padding: 0 0 2px; width: 100%; min-width: 0; max-width: 100%; }
.milestones li { flex: 1 1 0; width: auto; min-width: 44px; max-width: 100%; text-align: center; }
.axis-node { display: block; min-width: 0; max-width: 100%; color: #c5c0b6; text-decoration: none; font-size: 12px; }
.axis-node .dot { display: block; width: 14px; height: 14px; margin: 0 auto 8px; border-radius: 50%; background: #c4a572; }
.axis-node .lab, .axis-node .yr { display: block; line-height: 1.3; }
.axis-node .yr { color: #c4a572; font-weight: 700; }
.axis-hero > :not(.axis-vignette) { position: relative; z-index: 1; }
.axis-vignette { position: absolute; inset: 0; z-index: 0; pointer-events: none; background: #161c24; }
.axis-vignette img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center 42%; opacity: 0.4;
}
.axis-vignette::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(22, 28, 36, 0.62) 0%, rgba(22, 28, 36, 0.22) 46%, rgba(22, 28, 36, 0.55) 100%);
}
.axis-hero .kicker { margin: 0 0 8px; font-size: var(--civ-type-kicker); font-weight: 700; letter-spacing: 0.14em; color: #c4a572; }
.axis-title {
  margin: 0 0 8px; font-family: var(--font-serif); font-size: var(--civ-type-display);
  line-height: 1.25; font-weight: 700; color: #f7f1e6;
}
.axis-lede { margin: 0 0 18px; max-width: 36em; color: #c5c0b6; font-size: var(--civ-type-body); }
.axis-cta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.axis-hero .btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 44px; min-height: 44px; padding: 8px 14px; border-radius: 999px;
  font-size: 13px; font-weight: 700; text-decoration: none;
}
.axis-hero .btn-brass { background: var(--brass-ink-fill); color: #161c24; }
.axis-hero .btn-ghost { background: transparent; color: #e8e4dc; border: 1px solid rgba(232, 228, 220, 0.35); }
.masthead { display: flex; align-items: center; gap: 8px; min-height: 52px; }
.logo-link img { height: 36px; width: auto; }
.logo-link .logo-compact, .logo-link .logo-dark { display: none; }
@media (max-width: 700px) {
  .masthead { min-height: 44px; flex-wrap: wrap; }
  .logo-link .logo-full { display: none !important; }
  .logo-link .logo-compact.logo-light { display: block; }
  .logo-link img { height: 28px; }
  .hero-opening { padding: 56px 16px 40px; }
  .axis-hero.axis-slim { max-height: 300px; padding-top: 14px; padding-bottom: 12px; overflow: hidden; }
}
`.replace(/\n+/g, '\n').trim();

export function criticalStyleTag(): string {
  return `<style id="wn-critical">${CRITICAL_CSS}</style>`;
}

export interface LcpTail {
  stylesheets: string[];
  scripts?: string[];
  moduleSrc?: string;
  fonts?: string;
  /** Wait until this image has decoded, then one frame, before secondary requests. */
  imageId?: string;
}

/**
 * Secondary CSS, scripts, fonts and parked images start after the LCP paint.
 * A print-media stylesheet still downloads during parse, and on a fast machine
 * that download finishes before the paint, so Lantern charges it to LCP.
 */
export function afterLcpBootstrap(options: LcpTail): string {
  const payload = JSON.stringify({
    stylesheets: options.stylesheets,
    scripts: options.scripts ?? [],
    moduleSrc: options.moduleSrc ?? '',
    fonts: options.fonts ?? '',
    imageId: options.imageId ?? '',
  });
  return `<script id="wn-lcp-boot">(function(){var cfg=${payload};var started=false;function load(){if(started)return;started=true;cfg.stylesheets.forEach(function(href){var l=document.createElement("link");l.rel="stylesheet";l.href=href;document.head.appendChild(l)});document.querySelectorAll("source[data-srcset]").forEach(function(node){node.srcset=node.getAttribute("data-srcset")});document.querySelectorAll("img[data-src]").forEach(function(img){var set=img.getAttribute("data-srcset");var sizes=img.getAttribute("data-sizes");if(set)img.srcset=set;if(sizes)img.sizes=sizes;img.src=img.getAttribute("data-src")});cfg.scripts.forEach(function(src){var s=document.createElement("script");s.src=src;s.defer=true;document.body.appendChild(s)});if(cfg.moduleSrc){var m=document.createElement("script");m.type="module";m.crossOrigin="anonymous";m.src=cfg.moduleSrc;document.body.appendChild(m)}if(cfg.fonts){var fonts=cfg.fonts;function addFonts(){setTimeout(function(){var f=document.createElement("link");f.rel="stylesheet";f.href=fonts;document.head.appendChild(f)},8000)}if(document.readyState==="complete")addFonts();else window.addEventListener("load",addFonts)}}function later(fn){requestAnimationFrame(function(){requestAnimationFrame(fn)})}function afterEntry(match){var timer=0;var armed=false;function go(){if(armed)return;clearTimeout(timer);timer=setTimeout(function(){if(armed)return;armed=true;later(load)},300)}try{var po=new PerformanceObserver(function(list){var entries=list.getEntries();for(var i=0;i<entries.length;i++){if(!match||match(entries[i]))go()}});po.observe({type:"largest-contentful-paint",buffered:true})}catch(e){go()}setTimeout(function(){if(armed)return;armed=true;load()},4000)}var img=cfg.imageId&&document.getElementById(cfg.imageId);if(img)afterEntry(function(entry){return entry.element===img});else afterEntry(null)})();</script>`;
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
