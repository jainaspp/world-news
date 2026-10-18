# civilization static assets (Art P0)

Date: 2026-10-17 HKT
Source: Art GenerateImage + home-axis-hero-v1
Red lines: no Taiwan / politics / border maps / faces / flags

**Batch A remake 2026-10-18** (no old-crop): fresh Art WebP/JPEG replaced the public files for H1 axis, C0 hub, C1 origins layer, O0 origins hero, and O2–O4 origins stages. Hub still serves `overview-hero-v1.jpg` and prefers the new `civ-hub-hero-{1200,960,640}w.webp` srcset. Batch A left tech, city, cosmos, and chronicle stage covers in place.

**Batch B remake 2026-10-18** (no old-crop): fresh Art WebP replaced chronicle stage covers S1–S10. Public files are `civ-stage-{1..10}-cover-{1280,640,400}w.webp` (1280×720 native; 640×400 and 400×250 are 16:10 center crops, not a recompress of the previous covers). Hub cards and chronicle figures keep the 640 src and include 1280w in the srcset. Axis, hub, origins, cosmos, tech, and city files are unchanged.

**Batch C remake 2026-10-18** (no old-crop): fresh Art WebP replaced cosmos stage covers CS1–CS10. Public files are `cosmo-stage-{1..10}-cover-{1280,640,400}w.webp` (1280×720 native; 640×400 and 400×250 are 16:10 center crops, not a recompress of the previous covers). The cosmos page and hub cosmos card keep the 640 src and include 1280w in the srcset. Axis, hub, origins, civ-stage, tech, and city files are unchanged.

| Slot | Files | Notes |
|------|-------|-------|
| H1 axis-bg | civ-home-axis-bg-{640,960,1280,1920}w.webp (+jpg) | CSS bg; opacity 0.35–0.55 + ink mask; alt="" |
| C0 hub hero | overview-hero-v1.jpg; civ-hub-hero-{1200,960,640}w.webp | JPEG src; webp srcset preferred. Full opacity. |
| C1 layer origins | civ-layer-origins-{640,400}w.webp (+jpg); 640 also as 640×400 crop | 4:3 cover preferred 640×480 |
| O0 origins hero | civ-origins-hero-{1200,960,640}w.webp (+jpg) | 21:9 crop |
| O2 stage1 | civ-origins-stage1-{800,640}w.webp (+jpg) | 深層分離 · 抽象分叉 |
| O3 stage2 | civ-origins-stage2-{800,640}w.webp (+jpg) | 非洲現代人多樣性 · 多點柔光 |
| O4 stage3 | civ-origins-stage3-{800,640}w.webp (+jpg) | 全球擴張 · 粒子輻射 · 非地圖 |

Masters also under /workspace/world-news/assets/civilization/

Checked-in drop is WebP only (JPEG twins were not attached), plus `overview-hero-v1.jpg`. `node-city-v1.jpg` / `node-tech-v1.jpg` remain secondary layer covers. `node-today` is not mounted on the axis.

| Slot | Files | Notes |
|------|-------|-------|
| S1–S10 stage covers | civ-stage-{1..10}-cover-{1280,640,400}w.webp | Batch B remake 2026-10-18, not old-crop. 1280×720 plus 640×400 / 400×250 16:10 crops. Hub cards and chronicle figures. Strip stays a paper ordinal; no `civ-node-*-480w` thumb is on disk. |
| CS1–CS10 cosmos covers | cosmo-stage-{1..10}-cover-{1280,640,400}w.webp | Batch C remake 2026-10-18, fresh art not old-crop. 1280×720 plus 640×400 / 400×250 16:10 crops. Hub cosmos card uses CS1. Paper ordinal is hidden unless the file fails. See `MANIFEST-cosmo-stages.md`. |
| T1–T10 tech covers | tech-stage-{1..10}-cover-{640,400}w.webp | 640×400 and 400×250, 16:10. Interim crops of `node-tech-v1.jpg` for `/civilization/tech/`. Page hero keeps the full JPEG. |
| U1–U10 city covers | city-stage-{1..10}-cover-{640,400}w.webp | 640×400 and 400×250, 16:10. Interim crops of `node-city-v1.jpg` for `/civilization/city/`. Page hero keeps the full JPEG. |
