import assert from "node:assert/strict";
import { test } from "node:test";

import { staticSvg } from "../src/static-svg.ts";

const BACKGROUND = '<rect width="100%" height="100%" fill="#fff"/>';

/** A root shaped like Pele's: internal variables aliasing themeable ones. */
function svg(
  body: string,
  rootStyle = "--_bg:var(--pele-bg,#fff);--_s:var(--pele-surface,#f3f3f3)",
) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" style="${rootStyle}">${body}</svg>`;
}

function body(result: string): string {
  const start = result.indexOf(">") + 1;
  return result.slice(start, result.lastIndexOf("</svg>"));
}

test("resolves a root variable through to the theme's value", () => {
  const result = staticSvg(svg('<rect fill="var(--_s)"/>'), {
    "--pele-surface": "#222222",
  });

  assert.equal(body(result), `${BACKGROUND}<rect fill="#222222"/>`);
});

test("uses Pele's own default for a variable the theme leaves unset", () => {
  const result = staticSvg(svg('<rect fill="var(--_s)"/>'), {});

  assert.equal(body(result), `${BACKGROUND}<rect fill="#f3f3f3"/>`);
});

test("paints the theme's background behind the diagram", () => {
  const result = staticSvg(svg("<g/>"), { "--pele-bg": "#101010" });

  assert.equal(
    body(result),
    '<rect width="100%" height="100%" fill="#101010"/><g/>',
  );
});

test("lets a variable the diagram sets on its root override the theme", () => {
  const result = staticSvg(
    svg(
      '<path fill="var(--pele-series-1,#4c78a8)"/>',
      "--_bg:var(--pele-bg,#fff);--pele-series-1:#abcdef",
    ),
    { "--pele-series-1": "#000000" },
  );

  assert.equal(body(result), `${BACKGROUND}<path fill="#abcdef"/>`);
});

test("keeps a comma-separated fallback whole", () => {
  const result = staticSvg(
    svg("<g/>", "--_bg:#fff;font-family:var(--pele-font,Arial, sans-serif)"),
    {},
  );

  assert.match(result, / style="font-family:Arial, sans-serif"/);
});

test("resolves a variable nested in another variable's fallback", () => {
  const result = staticSvg(svg('<rect fill="var(--missing,var(--_s))"/>'), {});

  assert.equal(body(result), `${BACKGROUND}<rect fill="#f3f3f3"/>`);
});

test("drops the root's variable definitions and keeps its other styles", () => {
  const result = staticSvg(
    svg("<g/>", "--_bg:var(--pele-bg,#fff);color:var(--_bg);font:16px serif"),
    {},
  );

  assert.match(result, /^<svg [^>]* style="color:#fff;font:16px serif">/);
});

test("leaves a label that quotes var() syntax alone", () => {
  const label = "<text>var(--_s) and var(--pele-bg,#000)</text>";
  const result = staticSvg(svg(label), { "--pele-bg": "#101010" });

  assert.ok(result.includes(label));
});

test("leaves a reference to an unknown variable without a fallback", () => {
  const result = staticSvg(svg('<rect fill="var(--nope)"/>'), {});

  assert.equal(body(result), `${BACKGROUND}<rect fill="var(--nope)"/>`);
});

test("stops at a variable that refers to itself", () => {
  const result = staticSvg(
    svg('<rect fill="var(--_loop)"/>', "--_bg:#fff;--_loop:var(--_loop)"),
    {},
  );

  assert.equal(body(result), `${BACKGROUND}<rect fill="var(--_loop)"/>`);
});

test("mixes two colors in srgb", () => {
  const result = staticSvg(
    svg(
      '<rect stroke="color-mix(in srgb,var(--_a) 75%,var(--_bg))"/>',
      "--_bg:#ffffff;--_a:#000000",
    ),
    {},
  );

  assert.equal(body(result), `${BACKGROUND}<rect stroke="#404040"/>`);
});

test("expands shorthand hex colors when mixing", () => {
  const result = staticSvg(
    svg('<rect stroke="color-mix(in srgb,#000 50%,#fff)"/>', "--_bg:#fff"),
    {},
  );

  assert.equal(body(result), `${BACKGROUND}<rect stroke="#808080"/>`);
});

test("leaves a color mix it cannot compute", () => {
  const mix = "color-mix(in oklch,red 50%,#fff)";
  const result = staticSvg(svg(`<rect stroke="${mix}"/>`, "--_bg:#fff"), {});

  assert.equal(body(result), `${BACKGROUND}<rect stroke="${mix}"/>`);
});

test("moves a corner radius from CSS to the rx attribute", () => {
  const result = staticSvg(
    svg(
      '<rect width="4" fill="var(--_s)" style="rx:var(--_r)"/>',
      "--_bg:#fff;--_s:#eee;--_r:var(--pele-radius,4px)",
    ),
    {},
  );

  assert.equal(
    body(result),
    `${BACKGROUND}<rect width="4" fill="#eee" rx="4px"/>`,
  );
});

test("keeps the other declarations beside a moved corner radius", () => {
  const result = staticSvg(
    svg('<rect style="rx:6px;fill:#f00"/>', "--_bg:#fff"),
    {},
  );

  assert.equal(body(result), `${BACKGROUND}<rect style="fill:#f00" rx="6px"/>`);
});

test("replaces an rx attribute the CSS radius overrides", () => {
  const result = staticSvg(
    svg('<rect rx="12" width="4" style="rx:2px"/>', "--_bg:#fff"),
    {},
  );

  assert.equal(body(result), `${BACKGROUND}<rect width="4" rx="2px"/>`);
});

test("keeps a style value that contains an escaped quote", () => {
  const result = staticSvg(
    svg('<text style="font-family:&quot;Courier New&quot;;fill:var(--_s)"/>'),
    {},
  );

  assert.equal(
    body(result),
    `${BACKGROUND}<text style="font-family:&quot;Courier New&quot;;fill:#f3f3f3"/>`,
  );
});

test("rejects markup that is not an SVG document", () => {
  assert.throws(() => staticSvg("<p>nope</p>", {}), {
    message: "Expected an SVG document from Pele, got: <p>nope</p>",
  });
});
