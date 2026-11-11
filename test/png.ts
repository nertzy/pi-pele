import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";

export interface Png {
  readonly width: number;
  readonly height: number;
  /** The top-left pixel, which a diagram's background covers. */
  readonly corner: string;
}

/** Read a PNG's size and top-left pixel. */
export function decode(png: Buffer): Png {
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
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
  const pixel = inflateSync(Buffer.concat(data)).subarray(1, 4);
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    corner: pixel.toString("hex"),
  };
}
