import assert from "node:assert/strict";
import { test } from "node:test";

import { mermaidFences } from "../src/fences.ts";

test("returns the body of each mermaid fence in order", () => {
  const markdown = [
    "Here is the flow:",
    "",
    "```mermaid",
    "flowchart LR",
    "  A --> B",
    "```",
    "",
    "and the sequence:",
    "",
    "~~~mermaid",
    "sequenceDiagram",
    "  A->>B: hi",
    "~~~",
  ].join("\n");

  assert.deepEqual(mermaidFences(markdown), [
    "flowchart LR\n  A --> B",
    "sequenceDiagram\n  A->>B: hi",
  ]);
});

test("ignores fences in other languages and unfenced text", () => {
  const markdown = [
    "```ts",
    "const mermaid = 1;",
    "```",
    "",
    "mermaid is a diagram language.",
  ].join("\n");

  assert.deepEqual(mermaidFences(markdown), []);
});

test("accepts an info string after the language and any language case", () => {
  const markdown = ["```Mermaid title=flow", "pie", '  "a" : 1', "```"].join(
    "\n",
  );

  assert.deepEqual(mermaidFences(markdown), ['pie\n  "a" : 1']);
});

test("removes the fence's own indentation from an indented fence", () => {
  const markdown = [
    "- a list item:",
    "",
    "  ```mermaid",
    "  flowchart TD",
    "    A --> B",
    "  ```",
  ].join("\n");

  assert.deepEqual(mermaidFences(markdown), ["flowchart TD\n  A --> B"]);
});

test("closes only on a fence at least as long as the opening one", () => {
  const markdown = [
    "````mermaid",
    "flowchart LR",
    '  A["```"] --> B',
    "```",
    "  B --> C",
    "````",
  ].join("\n");

  assert.deepEqual(mermaidFences(markdown), [
    'flowchart LR\n  A["```"] --> B\n```\n  B --> C',
  ]);
});

test("keeps a fence the message ends inside of", () => {
  const markdown = ["```mermaid", "flowchart LR", "  A --> B"].join("\n");

  assert.deepEqual(mermaidFences(markdown), ["flowchart LR\n  A --> B"]);
});

test("skips a mermaid fence with no body", () => {
  assert.deepEqual(mermaidFences("```mermaid\n```"), []);
});

test("handles CRLF line endings", () => {
  assert.deepEqual(mermaidFences("```mermaid\r\npie\r\n```\r\n"), ["pie"]);
});
