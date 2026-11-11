import { Resvg } from "@resvg/resvg-js";

/** What `rasterize` needs of a diagram: its SVG and size in CSS pixels. */
export interface Drawing {
  readonly svg: string;
  readonly width: number;
  readonly height: number;
}

export interface RasterOptions {
  /** Device pixels per CSS pixel. */
  readonly scale: number;
  /** Longest side of the PNG, in pixels; the scale drops to fit it. */
  readonly maxSide: number;
}

/** A PNG and its size in pixels. */
export interface Raster {
  readonly png: Buffer;
  readonly width: number;
  readonly height: number;
}

/**
 * Rasterize a standalone SVG to PNG, in-process and synchronously.
 *
 * Every call loads the system's fonts, which costs about 200 ms on a Mac with
 * a full font library and dwarfs the drawing itself. It buys two things worth
 * that: labels in scripts the preferred fonts lack (CJK, emoji) fall back to a
 * font that has them instead of rendering blank, and no table of per-platform
 * font paths has to be kept current. Callers rasterize once and keep the PNG.
 */
export function rasterize(drawing: Drawing, options: RasterOptions): Raster {
  if (!(options.scale > 0)) {
    throw new Error(
      `Expected scale to be a positive number, got ${options.scale}`,
    );
  }

  const longestSide = Math.max(drawing.width, drawing.height);
  const scale = Math.min(options.scale, options.maxSide / longestSide);
  const image = new Resvg(drawing.svg, {
    fitTo: { mode: "zoom", value: scale },
    font: { loadSystemFonts: true },
  }).render();
  return { png: image.asPng(), width: image.width, height: image.height };
}
