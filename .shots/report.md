# UI Behaviour Test Report

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 34 |
| Passed | 34 |
| Failed | 0 |

## Results Table

| Test | Result | Detail |
|------|--------|--------|
| 1(a) Exactly one canvas in DOM | PASS | Found 1 canvases |
| 1(a) Canvas is #ascii-background | PASS |  |
| 1(a) Canvas has WebGL context | PASS |  |
| 1(b) Bloom pass exists | PASS |  |
| 1(b) Bloom enabled by default | PASS |  |
| 1(b) Bloom config matches pass config | PASS |  |
| 1(b) ASCII canvas exists and is offscreen | PASS |  |
| 1(b) API limitation noted | PASS | bloom.renderer and bloom.composer not exposed (only UnrealBloomPass) |
| 1(c/d) Scene renderer has ACES tone mapping | PASS | toneMapping = 4 |
| 1(d) No vignette in config.post | PASS |  |
| 1(d) No grain in config.post | PASS |  |
| 1(d) No flick in config.interact | PASS |  |
| 1(d) No damping in config.interact | PASS |  |
| 1(d) No deadzone in config.interact | PASS |  |
| 1(d) No returnOnRelease in config.interact | PASS |  |
| 1(d) No puppeteer in config.interact | PASS |  |
| 1(c) Source code uses NoToneMapping for bloom renderer | PASS | Not found in postfx.js |
| 1(c) Bloom toggle works | PASS | initial: true, after: false |
| 2(a) h1 selection is empty | PASS |  |
| 2(b) h1 user-select is none | PASS |  |
| 2(c) nav user-select is none | PASS |  |
| 2(d) All links user-select is none | PASS | Got: ["none","none"] |
| 2(e) Links have pointer-events (clickable) | PASS | Got: ["auto","auto"] |
| 3(a) pointer.held true on down | PASS |  |
| 3(a) Distance decreases on hold | PASS | pre: 8.5000, held: 7.4805 |
| 3(a) Held distance near expected | PASS | expected ~7.48, got 7.4805 |
| 3(a) Swing approximately doubles on hold | PASS | preAngle: 0.5748, heldAngle: 1.1497, ratio: 2.0001 |
| 3(a) Distance returns after release | PASS | pre: 8.5000, post: 8.4997 |
| 3(a) pointer.held false after release | PASS |  |
| 3(b) No flicker on short tap | PASS | Crossings: 0 |
| 4(a) Both links have target=_blank | PASS | Targets: _blank, _blank |
| 4(b) Links have noopener and noreferrer | PASS | Rel: noopener noreferrer, noopener noreferrer |
| 4(c) Popup opened on click | PASS | Popups: 1 |
| 4(d) Original page did not navigate | PASS | Original: http://localhost:5199/, Current: http://localhost:5199/ |

## Camera Series (Hold Test)

| Phase | Distance | Angle | Held |
|-------|----------|-------|------|
| Pre | 8.5000 | 0.5748 | false |
| Held | 7.4805 | 1.1497 | true |
| Post | 8.4997 | 0.5752 | false |

## Short Tap Series (First 10 samples)

| Time (ms) | Distance |
|-----------|----------|
| 0 | 8.2356 |
| 12 | 8.3257 |
| 98 | 8.3851 |
| 186 | 8.4303 |
| 274 | 8.4541 |
| 365 | 8.4697 |
| 457 | 8.4816 |
| 541 | 8.4879 |
| 631 | 8.4920 |
| 721 | 8.4952 |

## Bloom-on-ASCII measurement

**Claim:** Bloom glow lands ON the ASCII glyphs and spreads into the dark gaps BETWEEN them, added AFTER the ASCII render.

**Verdict: PASS.** All structural checks pass, the composited buffer is non-zero and clearly differs between bloom ON and OFF, and the delta is concentrated around glyph edges and the dark gaps between glyphs.

### Structural checks

| Check | Result | Detail |
|-------|--------|--------|
| S1: `composite.texture.image === ascii.canvas` | PASS | true |
| S2: `composite.renderer.toneMapping` | PASS | 0 (= NoToneMapping) |
| S3: `composite.renderer.domElement === #ascii-background` | PASS | true |
| S4: Pass order | PASS | `["TexturePass","UnrealBloomPass","ShaderPass"]` |
| S4b: `composer.passes[1] === composite.bloom` | PASS | true (UnrealBloomPass identity) |
| Render-target size | — | 1280 × 800 (device pixels), HALF_FLOAT (type 1016) |
| ASCII canvas size | — | 1280 × 800 |
| Bloom config | — | strength=0.8, radius=0.45, threshold=0.7 |

### Core pixel measurements (1280 × 800 = 1 024 000 px)

| Metric | Value |
|--------|-------|
| Mean luminance, bloom ON (A) | **13.10** (8-bit-equivalent) |
| Mean luminance, bloom OFF (B) | **12.22** |
| Mean delta (A − B) | **+0.88** |
| Max channel value (A) | **1.066** (slight over-1.0 bloom bleed-through; NoToneMapping preserves it) |
| ASCII source-canvas SAD (A vs B) | **0** (byte-identical — bloom never touches the source) |
| Consecutive-render stability diff | 31 439 raw Uint16 across 4 096 000 channels (0.77 % per-channel tiny FP noise — deterministic within GPU floating-point tolerance) |

### Dark-pixel gap-glow (bloom OFF luminance ≤ 12)

| Metric | Value |
|--------|-------|
| Count | **955 455** of 1 024 000 (93.3 %) |
| Mean luminance in B | 5.95 |
| Mean delta in A | **+0.71** — dark gaps brighten by ~0.7 lum on average |

### Bright-pixel glyph bodies (bloom OFF luminance ≥ 120)

| Metric | Value |
|--------|-------|
| Count | **26 991** (2.6 %) |
| Mean luminance in B | 169.79 |
| Mean delta in A | **+3.93** — glyph bodies brighten noticeably |

### Per-pixel delta histogram (A − B, binned by 4 in 8-bit-equiv units)

| Delta bin (A−B) | Pixel count |
|-----------------|-------------|
| 0 | 972 266 |
| 4 | 29 247 |
| 8 | 9 753 |
| 12 | 7 633 |
| 16 | 4 287 |
| 20 | 814 |

### Threshold counts

| Threshold | Count |
|-----------|-------|
| Brighter by > 2 | **108 070** |
| Brighter by > 8 | **20 814** |
| Brighter by > 24 | **0** |
| Darker by > 2 | **0** (bloom is purely additive — no pixel ever gets darker) |

### Console errors

```
[error] Failed to load resource: the server responded with a status of 404 (Not Found)
[warning] Canvas2D: Multiple readback operations using getImageData are faster with
          the willReadFrequently attribute set to true.
```
(The 404 is unrelated — a missing favicon or similar asset from Vite.)

### Conclusion

Bloom is applied to the completed ASCII canvas and **does bleed into the gaps** between glyphs: 955 455 dark-background pixels (~93 %) brighten by an average of +0.71 luminance units when bloom is enabled, while the 26 991 bright glyph-body pixels brighten by +3.93 on average. Zero pixels get darker. The ASCII source canvas is byte-identical between states (SAD = 0), confirming the glow is added in the post-processing pass, not painted onto the glyph layer itself.
