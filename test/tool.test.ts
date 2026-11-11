import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { callSummary, renderDiagramCall } from "../src/tool.ts";
import { decode, type Png } from "./png.ts";
import { headlessSession, terminalSession } from "./sessions.ts";

const FLOWCHART = "flowchart LR\n  A[Start] --> B[End]";

let cwd: string;
beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), "pi-pele-"));
});
afterEach(async () => {
  await rm(cwd, { recursive: true });
});

/** The PNG a result shows inline. */
function preview(result: Awaited<ReturnType<typeof renderDiagramCall>>): Png {
  const image = result.content.find((part) => part.type === "image");
  assert.ok(image);
  assert.equal(image.mimeType, "image/png");
  return decode(Buffer.from(image.data, "base64"));
}

test("shows the diagram inline in the Pi theme's colors", async () => {
  const result = await renderDiagramCall(
    { source: FLOWCHART },
    terminalSession(cwd),
  );

  assert.deepEqual(result.content[0], {
    type: "text",
    text: "Rendered flowchart diagram, 199x64.",
  });
  assert.equal(preview(result).corner, "0a141e");
});

test("draws a small diagram on a canvas as wide as the terminal shows it", async () => {
  const result = await renderDiagramCall(
    { source: FLOWCHART },
    terminalSession(cwd),
  );

  // 600 CSS pixels at two device pixels each; the height is the diagram's own.
  assert.deepEqual(
    { width: preview(result).width, height: preview(result).height },
    { width: 1200, height: 128 },
  );
});

test("uses the light theme when Pi has no terminal UI to match", async () => {
  const result = await renderDiagramCall(
    { source: FLOWCHART },
    headlessSession(cwd),
  );

  assert.equal(preview(result).corner, "ffffff");
});

test("uses a fixed theme when asked, even for viewing", async () => {
  const result = await renderDiagramCall(
    { source: FLOWCHART, theme: "dark" },
    terminalSession(cwd),
  );

  assert.equal(preview(result).corner, "1e1e1e");
});

test("reads the source from a file in the working directory", async () => {
  await writeFile(join(cwd, "flow.mmd"), FLOWCHART);

  const result = await renderDiagramCall(
    { path: "flow.mmd" },
    terminalSession(cwd),
  );

  assert.deepEqual(result.content[0], {
    type: "text",
    text: "Rendered flowchart diagram, 199x64.",
  });
});

test("reads a path a model prefixed with @", async () => {
  await writeFile(join(cwd, "flow.mmd"), FLOWCHART);

  const result = await renderDiagramCall(
    { path: "@flow.mmd" },
    terminalSession(cwd),
  );

  assert.equal(preview(result).corner, "0a141e");
});

test("writes an SVG in the chosen theme, at the diagram's own size", async () => {
  const result = await renderDiagramCall(
    { source: FLOWCHART, output: "docs/images/flow.svg", theme: "dark" },
    terminalSession(cwd),
  );

  const svg = await readFile(join(cwd, "docs/images/flow.svg"), "utf8");
  assert.match(svg, /^<svg [^>]*viewBox="0 0 199 64" width="199" height="64"/);
  assert.match(svg, /<rect width="100%" height="100%" fill="#1e1e1e"\/>/);
  assert.deepEqual(result.content[0], {
    type: "text",
    text: "Rendered flowchart diagram, 199x64. Wrote docs/images/flow.svg.",
  });
  // The preview is the file's diagram, so it shows the file's theme.
  assert.equal(preview(result).corner, "1e1e1e");
});

test("writes a PNG at the requested scale", async () => {
  const result = await renderDiagramCall(
    { source: FLOWCHART, output: "flow.PNG", theme: "light", scale: 3 },
    terminalSession(cwd),
  );

  const png = decode(await readFile(join(cwd, "flow.PNG")));
  assert.deepEqual(png, { width: 597, height: 192, corner: "ffffff" });
  assert.deepEqual(result.content[0], {
    type: "text",
    text: "Rendered flowchart diagram, 199x64. Wrote flow.PNG, 597x192 pixels.",
  });
});

test("writes a PNG at two pixels per unit unless told otherwise", async () => {
  await renderDiagramCall(
    { source: FLOWCHART, output: "flow.png", theme: "light" },
    terminalSession(cwd),
  );

  const png = decode(await readFile(join(cwd, "flow.png")));
  assert.deepEqual(
    { width: png.width, height: png.height },
    { width: 398, height: 128 },
  );
});

test("writes a file in the Pi theme only when asked to", async () => {
  await renderDiagramCall(
    { source: FLOWCHART, output: "flow.png", theme: "pi" },
    terminalSession(cwd),
  );

  assert.equal(decode(await readFile(join(cwd, "flow.png"))).corner, "0a141e");
});

test("asks for a theme before writing a file", async () => {
  await assert.rejects(
    renderDiagramCall(
      { source: FLOWCHART, output: "flow.svg" },
      terminalSession(cwd),
    ),
    {
      message:
        'Expected theme with output. Choose "light" or "dark" to suit where flow.svg will be shown, or "pi" to keep this session\'s colors.',
    },
  );
});

test("rejects an output that is neither SVG nor PNG", async () => {
  await assert.rejects(
    renderDiagramCall(
      { source: FLOWCHART, output: "flow.pdf", theme: "light" },
      terminalSession(cwd),
    ),
    { message: "Expected output to end in .svg or .png, got flow.pdf" },
  );
});

test("asks for exactly one of source and path", async () => {
  const message = "Expected exactly one of source and path.";

  await assert.rejects(renderDiagramCall({}, terminalSession(cwd)), {
    message,
  });
  await assert.rejects(
    renderDiagramCall(
      { source: FLOWCHART, path: "flow.mmd" },
      terminalSession(cwd),
    ),
    { message },
  );
});

test("reports a syntax error with its line, and writes nothing", async () => {
  await assert.rejects(
    renderDiagramCall(
      {
        source: "flowchart LR\n  A --> [oops",
        output: "flow.svg",
        theme: "light",
      },
      terminalSession(cwd),
    ),
    {
      name: "PeleError",
      message: /^Parse error on line 2:\n {2}A --> \[oops\n/,
    },
  );
  await assert.rejects(readFile(join(cwd, "flow.svg")), { code: "ENOENT" });
});

test("summarizes a call by the diagram's opening line", () => {
  assert.equal(callSummary({ source: FLOWCHART }), "flowchart LR");
});

test("skips front matter and comments to find the opening line", () => {
  const source =
    "---\ntitle: Flow\n---\n\n%% a comment\nsequenceDiagram\n  A->>B: hi";

  assert.equal(callSummary({ source }), "sequenceDiagram");
});

test("summarizes a call by its file, output, and theme", () => {
  assert.equal(
    callSummary({ path: "flow.mmd", output: "flow.svg", theme: "dark" }),
    "flow.mmd → flow.svg (dark)",
  );
});

test("summarizes a call whose arguments are still arriving", () => {
  assert.equal(callSummary({}), "");
});
