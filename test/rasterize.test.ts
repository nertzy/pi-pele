import assert from "node:assert/strict";
import { test } from "node:test";

import { rasterize } from "../src/rasterize.ts";

const PNG_SIGNATURE = "89504e470d0a1a0a";

function drawing(width: number, height: number) {
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#336699"/></svg>`,
    width,
    height,
  };
}

/** The size a PNG declares in its header, independent of what we report. */
function declaredSize(png: Buffer) {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test("encodes a PNG at the requested scale", () => {
  const raster = rasterize(drawing(100, 50), { scale: 2, maxSide: 2000 });

  assert.equal(raster.png.subarray(0, 8).toString("hex"), PNG_SIGNATURE);
  assert.deepEqual(declaredSize(raster.png), { width: 200, height: 100 });
  assert.deepEqual(
    { width: raster.width, height: raster.height },
    { width: 200, height: 100 },
  );
});

test("lowers the scale so the longer side fits the limit", () => {
  const raster = rasterize(drawing(1000, 250), { scale: 4, maxSide: 2000 });

  assert.deepEqual(declaredSize(raster.png), { width: 2000, height: 500 });
});

test("shrinks a drawing that exceeds the limit at its natural size", () => {
  const raster = rasterize(drawing(400, 3000), { scale: 1, maxSide: 1500 });

  assert.deepEqual(declaredSize(raster.png), { width: 200, height: 1500 });
});

test("rejects a scale that is not a positive number", () => {
  for (const scale of [0, -1, Number.NaN]) {
    assert.throws(() => rasterize(drawing(10, 10), { scale, maxSide: 2000 }), {
      message: `Expected scale to be a positive number, got ${scale}`,
    });
  }
});
