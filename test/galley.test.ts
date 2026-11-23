import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  getCellDimensions,
  resetCapabilitiesCache,
  setCapabilities,
  setCellDimensions,
  Text,
} from "@earendil-works/pi-tui";

import { atNaturalSize, KeptDiagram } from "../src/galley.ts";
import { rasterize } from "../src/rasterize.ts";

const FULL_WIDTH = Symbol.for("pi-galley.full-width");
const IMAGE_WIDTH = Symbol.for("pi-galley.image-width");
const MEASURE = Symbol.for("pi-galley.measure");

const globals = globalThis as { [MEASURE]?: () => number };
const terminalCells = getCellDimensions();

beforeEach(() => {
  setCapabilities({ images: "kitty", trueColor: true, hyperlinks: false });
  setCellDimensions({ widthPx: 10, heightPx: 20 });
});

afterEach(() => {
  delete globals[MEASURE];
  resetCapabilitiesCache();
  setCellDimensions(terminalCells);
});

/** pi-galley publishes its measure for as long as it is loaded. */
function loadGalley() {
  globals[MEASURE] = () => 80;
}

/** A kept diagram whose PNG is `width` by `height` pixels. */
function keptDiagram(width: number, height: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"/>`;
  const { png } = rasterize(
    { svg, width, height },
    { scale: 1, maxSide: 8192 },
  );
  return new KeptDiagram(png.toString("base64"), {
    fallbackColor: (text) => text,
  });
}

/** The cells a terminal is told to draw an image over. */
function cells(lines: string[]) {
  const placement = /c=(\d+),r=(\d+)/.exec(lines[0] ?? "");
  assert.ok(placement, `Expected an image, got: ${JSON.stringify(lines)}`);
  assert.equal(lines.length, Number(placement[2]));
  return { columns: Number(placement[1]), rows: Number(placement[2]) };
}

test("a tool's line asks pi-galley for natural-size images on a full-width block", () => {
  const line = atNaturalSize(new Text("render_diagram", 0, 0));

  assert.ok(line instanceof Text);
  assert.equal((line as { [IMAGE_WIDTH]?: unknown })[IMAGE_WIDTH], "natural");
  assert.equal((line as { [FULL_WIDTH]?: unknown })[FULL_WIDTH], true);
});

test("a kept diagram asks pi-galley for a full-width block", () => {
  const diagram = keptDiagram(300, 100);

  assert.equal((diagram as { [FULL_WIDTH]?: unknown })[FULL_WIDTH], true);
});

test("with pi-galley, a wide kept diagram is drawn a pixel per terminal pixel", () => {
  loadGalley();

  assert.deepEqual(cells(keptDiagram(1000, 200).render(200)), {
    columns: 100,
    rows: 10,
  });
});

test("with pi-galley, a narrow kept diagram is not stretched", () => {
  loadGalley();

  assert.deepEqual(cells(keptDiagram(300, 100).render(200)), {
    columns: 30,
    rows: 5,
  });
});

test("with pi-galley, a tall kept diagram keeps its height", () => {
  loadGalley();

  assert.deepEqual(cells(keptDiagram(400, 1200).render(200)), {
    columns: 40,
    rows: 60,
  });
});

test("with pi-galley, a kept diagram wider than the terminal shrinks to fit", () => {
  loadGalley();

  // Pi's Image stops two cells short of the width it is given.
  assert.deepEqual(cells(keptDiagram(1000, 200).render(52)), {
    columns: 50,
    rows: 5,
  });
});

test("without pi-galley, a kept diagram is drawn at Pi's own size", () => {
  assert.deepEqual(cells(keptDiagram(1000, 200).render(200)), {
    columns: 60,
    rows: 6,
  });
});

test("a kept diagram follows pi-galley loading after it was first drawn", () => {
  const diagram = keptDiagram(1000, 200);
  assert.equal(cells(diagram.render(200)).columns, 60);

  loadGalley();

  assert.equal(cells(diagram.render(200)).columns, 100);
});

test("a kept diagram follows the terminal's cell size changing", () => {
  loadGalley();
  const diagram = keptDiagram(1000, 200);
  assert.equal(cells(diagram.render(200)).columns, 100);

  setCellDimensions({ widthPx: 20, heightPx: 40 });

  assert.deepEqual(cells(diagram.render(200)), { columns: 50, rows: 5 });
});

test("a kept diagram is a text placeholder where the terminal draws no images", () => {
  setCapabilities({ images: null, trueColor: true, hyperlinks: false });
  loadGalley();

  assert.deepEqual(keptDiagram(300, 100).render(200), [
    "[Image: [image/png] 300x100]",
  ]);
});
