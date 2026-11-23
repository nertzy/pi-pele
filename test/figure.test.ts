import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  getCellDimensions,
  resetCapabilitiesCache,
  setCapabilities,
  setCellDimensions,
} from "@earendil-works/pi-tui";

import { Figure } from "../src/figure.ts";
import { rasterize } from "../src/rasterize.ts";

const FULL_WIDTH = Symbol.for("pi-galley.full-width");

const terminalCells = getCellDimensions();

beforeEach(() => {
  setCapabilities({ images: "kitty", trueColor: true, hyperlinks: false });
  setCellDimensions({ widthPx: 10, heightPx: 20 });
});

afterEach(() => {
  resetCapabilitiesCache();
  setCellDimensions(terminalCells);
});

/** A figure whose PNG is `width` by `height` pixels. */
function figure(width: number, height: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"/>`;
  const { png } = rasterize(
    { svg, width, height },
    { scale: 1, maxSide: 8192 },
  );
  return new Figure(png.toString("base64"), { fallbackColor: (text) => text });
}

/** The cells a terminal is told to draw an image over. */
function cells(lines: string[]) {
  const placement = /c=(\d+),r=(\d+)/.exec(lines[0] ?? "");
  assert.ok(placement, `Expected an image, got: ${JSON.stringify(lines)}`);
  assert.equal(lines.length, Number(placement[2]));
  return { columns: Number(placement[1]), rows: Number(placement[2]) };
}

test("a wide figure is drawn a pixel per terminal pixel", () => {
  assert.deepEqual(cells(figure(1000, 200).render(200)), {
    columns: 100,
    rows: 10,
  });
});

test("a narrow figure is not stretched", () => {
  assert.deepEqual(cells(figure(300, 100).render(200)), {
    columns: 30,
    rows: 5,
  });
});

test("a tall figure keeps its height", () => {
  assert.deepEqual(cells(figure(400, 1200).render(200)), {
    columns: 40,
    rows: 60,
  });
});

test("a figure wider than the terminal shrinks to fit", () => {
  // Pi's Image stops two cells short of the width it is given.
  assert.deepEqual(cells(figure(1000, 200).render(52)), {
    columns: 50,
    rows: 5,
  });
});

test("a figure follows the terminal's cell size changing", () => {
  const drawn = figure(1000, 200);
  assert.equal(cells(drawn.render(200)).columns, 100);

  setCellDimensions({ widthPx: 20, heightPx: 40 });

  assert.deepEqual(cells(drawn.render(200)), { columns: 50, rows: 5 });
});

test("a figure keeps the terminal's copy of its image when it is resized", () => {
  const drawn = figure(1000, 200);
  const id = /i=(\d+)/.exec(drawn.render(200)[0] ?? "")?.[1];

  setCellDimensions({ widthPx: 20, heightPx: 40 });

  assert.ok(id);
  assert.equal(/i=(\d+)/.exec(drawn.render(200)[0] ?? "")?.[1], id);
});

test("a figure is a text placeholder where the terminal draws no images", () => {
  setCapabilities({ images: null, trueColor: true, hyperlinks: false });

  assert.deepEqual(figure(300, 100).render(200), [
    "[Image: [image/png] 300x100]",
  ]);
});

test("a figure asks pi-galley, where it is loaded, for a block as wide as the terminal", () => {
  assert.equal(
    (figure(300, 100) as { [FULL_WIDTH]?: unknown })[FULL_WIDTH],
    true,
  );
});
