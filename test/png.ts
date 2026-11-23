import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";

export interface Png {
  readonly width: number;
  readonly height: number;
  /**
   * The top-left pixel, which a painted canvas covers: its color as hex, or
   * `"clear"` where nothing was painted.
   */
  readonly corner: string;
}

/** Read a PNG's size and top-left pixel. */
export function decode(png: Buffer): Png {
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  // Color type 6: red, green, blue, and alpha, which is what resvg writes.
  assert.equal(png.readUInt8(25), 6);
  const data: Buffer[] = [];
  for (let offset = 8; offset < png.length; ) {
    const length = png.readUInt32BE(offset);
    if (png.toString("latin1", offset + 4, offset + 8) === "IDAT") {
      data.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }
  // Byte 0 is the first row's filter. Every PNG filter leaves the first pixel
  // of the first row as it is, since it has no neighbor to predict from.
  const pixel = inflateSync(Buffer.concat(data)).subarray(1, 5);
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    corner: pixel[3] === 0 ? "clear" : pixel.subarray(0, 3).toString("hex"),
  };
}
