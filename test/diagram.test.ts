import assert from "node:assert/strict";
import { test } from "node:test";

import { PeleError } from "pele";

import { renderDiagram } from "../src/diagram.ts";
import { THEMES } from "../src/themes.ts";
import { SAMPLES } from "./samples.ts";

const FLOWCHART = "flowchart LR\n  A[Start] --> B[End]";

/** The markup of a document: its tags, without the text between them. */
function markup(svg: string): string {
  return (svg.match(/<[^>]*>/g) ?? []).join("");
}

test("renders Mermaid source to a sized SVG and names its type", () => {
  const diagram = renderDiagram(FLOWCHART, THEMES.light);

  assert.equal(diagram.type, "flowchart");
  assert.ok(diagram.width > 0 && diagram.height > 0);
  assert.match(
    diagram.svg,
    new RegExp(
      `^<svg [^>]*width="${diagram.width}" height="${diagram.height}"`,
    ),
  );
});

test("paints a white background in the light theme", () => {
  const { svg } = renderDiagram(FLOWCHART, THEMES.light);

  assert.ok(svg.includes('<rect width="100%" height="100%" fill="#fff"/>'));
});

test("paints a dark background and light text in the dark theme", () => {
  const { svg } = renderDiagram(FLOWCHART, THEMES.dark);

  assert.ok(svg.includes('<rect width="100%" height="100%" fill="#1e1e1e"/>'));
  assert.match(svg, /^<svg [^>]* fill="#e6e6e6"/);
});

test("names fonts a rasterizer can find instead of generic families", () => {
  const { svg } = renderDiagram(FLOWCHART, THEMES.light);

  assert.match(svg, /^<svg [^>]*font-family:Arial, Helvetica, /);
});

for (const [name, source] of Object.entries(SAMPLES)) {
  test(`leaves nothing for a CSS engine to resolve in a ${name} diagram`, () => {
    for (const theme of Object.values(THEMES)) {
      const { svg } = renderDiagram(source, theme);

      assert.doesNotMatch(markup(svg), /var\(|color-mix\(|calc\(/);
    }
  });
}

test("reports a syntax error with its line and the offending source", () => {
  assert.throws(
    () => renderDiagram("flowchart LR\n  A --> B\n  B --> [oops", THEMES.light),
    (error) => {
      assert.ok(error instanceof PeleError);
      assert.equal(error.code, "syntax");
      assert.equal(error.line, 3);
      assert.match(
        error.message,
        /^Parse error on line 3:\n {2}B --> \[oops\n/,
      );
      return true;
    },
  );
});

test("reports text that is not a Mermaid diagram", () => {
  assert.throws(() => renderDiagram("hello world", THEMES.light), {
    name: "PeleError",
    message: "No diagram type detected for the given text.",
  });
});

test("does not embed images a diagram links to", () => {
  const { svg } = renderDiagram(
    'flowchart LR\n  A@{ img: "https://example.com/a.png", label: "Pic", w: 60, h: 60 }',
    THEMES.light,
  );

  assert.doesNotMatch(svg, /<image\b/);
});
