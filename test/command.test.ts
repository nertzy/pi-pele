import assert from "node:assert/strict";
import { test } from "node:test";

import { renderFences } from "../src/command.ts";
import { decode } from "./png.ts";
import {
  headlessSession,
  TERMINAL_BACKGROUND,
  terminalSession,
} from "./sessions.ts";

const fence = (source: string) => `\`\`\`mermaid\n${source}\n\`\`\``;
const FLOWCHART = fence("flowchart LR\n  A[Start] --> B[End]");
const SEQUENCE = fence("sequenceDiagram\n  Alice->>Bob: Hello");
const BROKEN = fence("flowchart LR\n  A --> [oops");

test("renders each Mermaid fence in the Pi theme", () => {
  const { diagrams, failures } = renderFences(
    `A flow:\n\n${FLOWCHART}\n\nand a sequence:\n\n${SEQUENCE}\n`,
    terminalSession("/"),
  );

  assert.deepEqual(failures, []);
  assert.deepEqual(
    diagrams.map(({ type }) => type),
    ["flowchart", "sequence"],
  );
  for (const { png } of diagrams) {
    assert.equal(
      decode(Buffer.from(png, "base64")).corner,
      TERMINAL_BACKGROUND,
    );
  }
});

test("draws a fence as wide as the terminal shows it", () => {
  const [diagram] = renderFences(FLOWCHART, terminalSession("/")).diagrams;

  assert.ok(diagram);
  assert.equal(decode(Buffer.from(diagram.png, "base64")).width, 1200);
});

test("uses the light theme when Pi has no terminal UI to match", () => {
  const [diagram] = renderFences(FLOWCHART, headlessSession("/")).diagrams;

  assert.ok(diagram);
  assert.equal(decode(Buffer.from(diagram.png, "base64")).corner, "ffffff");
});

test("reports a fence that does not parse and renders the others", () => {
  const { diagrams, failures } = renderFences(
    `${FLOWCHART}\n\n${BROKEN}\n\n${SEQUENCE}\n`,
    terminalSession("/"),
  );

  assert.deepEqual(
    diagrams.map(({ type }) => type),
    ["flowchart", "sequence"],
  );
  assert.equal(failures.length, 1);
  assert.match(
    failures[0] ?? "",
    /^Diagram 2: Parse error on line 2:\n {2}A --> \[oops\n/,
  );
});

test("finds nothing in text without Mermaid fences", () => {
  assert.deepEqual(
    renderFences(
      "No diagrams.\n\n```js\nflowchart()\n```\n",
      terminalSession("/"),
    ),
    { diagrams: [], failures: [] },
  );
});
