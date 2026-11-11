import { type Diagram, widen } from "./diagram.ts";
import { rasterize } from "./rasterize.ts";

/**
 * CSS pixels Pi's terminal UI gives an inline image: its default 60 columns
 * at about ten pixels each. A preview's canvas is at least this wide, so a
 * small diagram is not stretched across all 60 columns.
 */
const WIDTH = 600;

/** Sharp on a high-density display, and small enough to send to a model. */
const RASTER = { scale: 2, maxSide: 2000 };

/** A diagram as the base64 PNG a Pi session shows inline. */
export function previewPng(diagram: Diagram): string {
  return rasterize(widen(diagram, WIDTH), RASTER).png.toString("base64");
}
