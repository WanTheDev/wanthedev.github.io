const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function parseHex(color) {
  const value = color.replace("#", "");
  const normalized = value.length === 3
    ? [...value].map((character) => character.repeat(2)).join("")
    : value;

  if (!/^[\da-f]{6}$/i.test(normalized)) {
    throw new Error(`ASCII colours must use #RGB or #RRGGBB. Received: ${color}`);
  }

  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
}

function interpolateColor(low, high, amount) {
  const channels = low.map((channel, index) =>
    Math.round(channel + (high[index] - channel) * amount),
  );
  return `rgb(${channels.join(",")})`;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    const url = typeof source === "string" ? source : source.src;
    image.onload = () => resolve({ image, frame: typeof source === "string" ? null : source });
    image.onerror = () => reject(new Error(`Unable to load ASCII glyph image: ${url}`));
    image.src = url;
  });
}

export class AsciiRenderer {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.sampleCanvas = document.createElement("canvas");
    this.sampleContext = this.sampleCanvas.getContext("2d", {
      alpha: false,
      willReadFrequently: true,
    });

    this.width = 1;
    this.height = 1;
    this.devicePixelRatio = 1;
    this.columns = 1;
    this.rows = 1;
    this.imageGlyphs = [];
    this.loadVersion = 0;
    this.ready = this.setOptions(options);
  }

  async setOptions(partial) {
    const current = this.options ?? {};
    this.options = {
      ...current,
      ...partial,
      colors: { ...current.colors, ...partial.colors },
      glyphs: { ...current.glyphs, ...partial.glyphs },
    };

    this.options.cellSize = Math.max(4, Number(this.options.cellSize) || 9);
    this.options.lineHeight = Math.max(0.8, Number(this.options.lineHeight) || 1.15);
    this.options.fps = Math.max(1, Number(this.options.fps) || 30);
    this.updatePalette();

    const version = ++this.loadVersion;
    if (this.options.glyphs.mode === "image") {
      const sources = this.options.glyphs.values ?? [];
      const loaded = await Promise.all(sources.map(loadImage));
      if (version === this.loadVersion) this.imageGlyphs = loaded;
    } else {
      this.imageGlyphs = [];
    }

    this.resize(this.width, this.height, this.devicePixelRatio);
  }

  updatePalette() {
    const low = parseHex(this.options.colors.low);
    const high = parseHex(this.options.colors.high);
    this.palette = Array.from({ length: 64 }, (_, index) =>
      interpolateColor(low, high, index / 63),
    );
  }

  resize(width, height, devicePixelRatio = 1) {
    // Coerce to numbers and clamp to sane minimums; NaN inputs must not
    // produce a NaN backing store that breaks the next draw.
    width = Number(width);
    height = Number(height);
    devicePixelRatio = Number(devicePixelRatio);
    if (!Number.isFinite(width) || width < 1) width = 1;
    if (!Number.isFinite(height) || height < 1) height = 1;
    // Allow sub-1 DPR so low-DPR displays do not upscale the backing store.
    this.width = Math.floor(width);
    this.height = Math.floor(height);
    this.devicePixelRatio = devicePixelRatio;

    const cellWidth = this.options.cellSize;
    const cellHeight = this.options.cellSize * this.options.lineHeight;
    this.columns = Math.max(1, Math.ceil(this.width / cellWidth));
    this.rows = Math.max(1, Math.ceil(this.height / cellHeight));

    this.canvas.width = Math.floor(this.width * this.devicePixelRatio);
    this.canvas.height = Math.floor(this.height * this.devicePixelRatio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(
      this.devicePixelRatio,
      0,
      0,
      this.devicePixelRatio,
      0,
      0,
    );

    this.sampleCanvas.width = this.columns;
    this.sampleCanvas.height = this.rows;
  }

  processBrightness(value) {
    const contrasted = (value - 0.5) * this.options.contrast + 0.5;
    const brightness = clamp(contrasted);
    return this.options.invert ? 1 - brightness : brightness;
  }
  /**
   * Glyph coverage already encodes brightness, so the sampled colour is
   * normalised to full saturation and only mildly darkened. That keeps the hue
   * of a bright pixel visible without washing the glyphs out to white.
   */
  sourceColor(red, green, blue, brightness) {
    const peak = Math.max(red, green, blue, 1);
    const value = (0.4 + 0.6 * brightness) / peak;
    return `rgb(${Math.round(red * value * 255)},${Math.round(
      green * value * 255,
    )},${Math.round(blue * value * 255)})`;
  }

  render(sourceCanvas) {
    const { context, sampleContext, columns, rows, options } = this;
    sampleContext.drawImage(sourceCanvas, 0, 0, columns, rows);
    const pixels = sampleContext.getImageData(0, 0, columns, rows).data;

    context.fillStyle = options.colors.background;
    context.fillRect(0, 0, this.width, this.height);

    const cellWidth = options.cellSize;
    const cellHeight = options.cellSize * options.lineHeight;
    const isImageMode = options.glyphs.mode === "image";
    const glyphs = isImageMode
      ? this.imageGlyphs
      : Array.isArray(options.glyphs.values)
        ? options.glyphs.values
        : Array.from(options.glyphs.values ?? " ");

    if (!glyphs.length) return;

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `${options.cellSize}px ${options.fontFamily}`;
    // In `source` mode the glyph takes the sampled scene colour, so the
    // post-processing hues (ramp, aberration, bloom) survive the ASCII pass.
    const tint = options.colors.mode === "source";

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const offset = (row * columns + column) * 4;
        const alpha = pixels[offset + 3] / 255;
        const luminance = (
          pixels[offset] * 0.2126
          + pixels[offset + 1] * 0.7152
          + pixels[offset + 2] * 0.0722
        ) / 255 * alpha;
        const brightness = this.processBrightness(luminance);
        const glyphIndex = Math.min(
          glyphs.length - 1,
          Math.floor(brightness * glyphs.length),
        );
        const glyph = glyphs[glyphIndex];
        const x = (column + 0.5) * cellWidth;
        const y = (row + 0.5) * cellHeight;

        if (isImageMode) {
          const size = Math.min(cellWidth, cellHeight) * options.spriteScale;
          const destination = [x - size / 2, y - size / 2, size, size];
          if (glyph.frame?.width && glyph.frame?.height) {
            context.drawImage(
              glyph.image,
              glyph.frame.x ?? 0,
              glyph.frame.y ?? 0,
              glyph.frame.width,
              glyph.frame.height,
              ...destination,
            );
          } else {
            context.drawImage(glyph.image, ...destination);
          }
        } else if (glyph && !/^\s+$/u.test(glyph)) {
          context.fillStyle = tint
            ? this.sourceColor(
                pixels[offset],
                pixels[offset + 1],
                pixels[offset + 2],
                brightness,
              )
            : this.palette[Math.round(brightness * 63)];
          context.fillText(glyph, x, y);
        }
      }
    }
  }
}
