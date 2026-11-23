import type { Diagram } from "./diagram.ts";
import { rasterize } from "./rasterize.ts";

/**
 * Sharp on a high-density display. The session draws a preview and no model
 * reads it, so its longest side is held only to what a PNG file's is.
 */
const RASTER = { scale: 2, maxSide: 8192 };

/** A diagram as the base64 PNG a Pi session draws in its transcript. */
export function previewPng(diagram: Diagram): string {
  return rasterize(diagram, RASTER).png.toString("base64");
}
