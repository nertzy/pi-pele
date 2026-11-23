import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  discoverAndLoadExtensions,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import {
  getCellDimensions,
  resetCapabilitiesCache,
  setCapabilities,
  setCellDimensions,
} from "@earendil-works/pi-tui";
import extension from "../extension.ts";
import { Figure } from "../src/figure.ts";
import { decode } from "./png.ts";
import { TERMINAL_BACKGROUND, terminalSession } from "./sessions.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const extensionPath = resolve(root, "extension.ts");

const FLOWCHART = "flowchart LR\n  A[Start] --> B[End]";
const fence = (source: string) => `\`\`\`mermaid\n${source}\n\`\`\``;

/** What the extension registered with Pi, and what it appended since. */
function load() {
  // biome-ignore lint/suspicious/noExplicitAny: a recording stand-in for Pi's API, which is checked where extension.ts calls it.
  const registered: Record<string, any> = {};
  const appended: { customType: string; data: unknown }[] = [];
  const pi = {
    registerTool: (tool: { name: string }) => {
      registered[`tool ${tool.name}`] = tool;
    },
    registerCommand: (name: string, command: unknown) => {
      registered[`command ${name}`] = command;
    },
    registerEntryRenderer: (customType: string, renderer: unknown) => {
      registered[`entry ${customType}`] = renderer;
    },
    appendEntry: (customType: string, data: unknown) => {
      appended.push({ customType, data });
    },
  };
  extension(pi as unknown as ExtensionAPI);
  return { registered, appended };
}

/** A terminal session whose branch holds these messages, oldest first. */
function sessionWith(...messages: { role: string; text: string }[]) {
  const notices: { message: string; level: string | undefined }[] = [];
  const session = terminalSession("/");
  return {
    notices,
    ctx: {
      ...session,
      ui: {
        ...session.ui,
        notify: (message: string, level?: string) => {
          notices.push({ message, level });
        },
      },
      sessionManager: {
        getBranch: () =>
          messages.map(({ role, text }) => ({
            type: "message",
            message: { role, content: [{ type: "text", text }] },
          })),
      },
    },
  };
}

/** A theme that leaves text as it is. */
const plainTheme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => text,
};

/** A theme that shows which color text is in. */
const namingTheme = {
  ...plainTheme,
  fg: (color: string, text: string) => `<${color}>${text}`,
};

/** What Pi tells a renderer about the call it draws: a finished one, unless overridden. */
const callState = (overrides: Record<string, unknown> = {}) => ({
  isPartial: false,
  isError: false,
  showImages: true,
  outputPad: 1,
  state: {},
  ...overrides,
});

const rendered = (component: { render(width: number): string[] }) =>
  component.render(200).map((row) => row.trimEnd());

/** Run the tool, and hand back what it registered and what it returned. */
async function renderFlowchart(params: Record<string, unknown> = {}) {
  const tool = load().registered["tool render_diagram"];
  const result = await tool.execute(
    "call-1",
    { source: FLOWCHART, ...params },
    undefined,
    undefined,
    terminalSession(cwd),
  );
  return { tool, result };
}

let cwd: string;
const terminalCells = getCellDimensions();

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), "pi-pele-"));
  setCapabilities({ images: "kitty", trueColor: true, hyperlinks: false });
  setCellDimensions({ widthPx: 10, heightPx: 20 });
});

afterEach(async () => {
  await rm(cwd, { recursive: true });
  resetCapabilitiesCache();
  setCellDimensions(terminalCells);
});

test("Pi loads the package entry with its tool and command", async () => {
  const loaded = await discoverAndLoadExtensions([extensionPath], root);

  assert.deepEqual(loaded.errors, []);
  const found = loaded.extensions.find(
    (candidate) => candidate.resolvedPath === extensionPath,
  );
  assert.ok(found);
  assert.deepEqual([...found.tools.keys()], ["render_diagram"]);
  assert.deepEqual([...found.commands.keys()], ["pele"]);
});

test("render_diagram draws a diagram in the session's theme, for the session alone", async () => {
  const { result } = await renderFlowchart();

  assert.deepEqual(result.content, [
    { type: "text", text: "Rendered flowchart diagram, 199x64." },
  ]);
  assert.equal(
    decode(Buffer.from(result.details.png, "base64")).corner,
    TERMINAL_BACKGROUND,
  );
});

test("render_diagram draws its own output, outside a tool box", () => {
  assert.equal(load().registered["tool render_diagram"].renderShell, "self");
});

test("while it renders, render_diagram is one muted line naming the diagram", () => {
  const tool = load().registered["tool render_diagram"];

  const line = tool.renderCall(
    { source: FLOWCHART },
    namingTheme,
    callState({ isPartial: true }),
  );

  assert.deepEqual(rendered(line), [" <muted>render_diagram flowchart LR"]);
});

test("render_diagram's line names the tool alone until arguments arrive", () => {
  const tool = load().registered["tool render_diagram"];

  const line = tool.renderCall({}, plainTheme, callState({ isPartial: true }));

  assert.deepEqual(rendered(line), [" render_diagram"]);
});

test("once it has rendered, render_diagram's line is gone", () => {
  const tool = load().registered["tool render_diagram"];

  const line = tool.renderCall({ source: FLOWCHART }, plainTheme, callState());

  assert.deepEqual(rendered(line), []);
});

test("a failed render_diagram keeps its line, to say what failed", () => {
  const tool = load().registered["tool render_diagram"];

  const line = tool.renderCall(
    { source: FLOWCHART },
    plainTheme,
    callState({ isError: true }),
  );

  assert.deepEqual(rendered(line), [" render_diagram flowchart LR"]);
});

test("render_diagram's result is the figure and nothing else", async () => {
  const { tool, result } = await renderFlowchart();

  const lines = rendered(
    tool.renderResult(result, { expanded: false }, plainTheme, callState()),
  );

  // 398 by 128 pixels, in cells of 10 by 20.
  assert.match(lines[0] ?? "", /c=39,r=6/);
  assert.deepEqual(lines.slice(1), ["", "", "", "", ""]);
});

test("a result that wrote a file names it under the figure", async () => {
  const { tool, result } = await renderFlowchart({
    output: "flow.svg",
    theme: "light",
  });

  const lines = rendered(
    tool.renderResult(result, { expanded: false }, namingTheme, callState()),
  );

  assert.match(lines[0] ?? "", /c=39,r=6/);
  assert.deepEqual(lines.slice(6), [" <muted>Wrote flow.svg."]);
});

test("a result drawn again keeps the terminal's copy of its figure", async () => {
  const { tool, result } = await renderFlowchart();
  const call = callState();
  const imageId = () =>
    /i=(\d+)/.exec(
      rendered(
        tool.renderResult(result, { expanded: false }, plainTheme, call),
      )[0] ?? "",
    )?.[1];

  const first = imageId();

  assert.ok(first);
  assert.equal(imageId(), first);
});

test("where the terminal draws no images, a result is its text", async () => {
  setCapabilities({ images: null, trueColor: true, hyperlinks: false });
  const { tool, result } = await renderFlowchart();

  const view = tool.renderResult(
    result,
    { expanded: false },
    namingTheme,
    callState(),
  );

  assert.deepEqual(rendered(view), [
    " <muted>Rendered flowchart diagram, 199x64.",
  ]);
});

test("with images turned off in Pi, a result is its text", async () => {
  const { tool, result } = await renderFlowchart();

  const view = tool.renderResult(
    result,
    { expanded: false },
    plainTheme,
    callState({ showImages: false }),
  );

  assert.deepEqual(rendered(view), [" Rendered flowchart diagram, 199x64."]);
});

test("a result an earlier version kept is its text, above the image Pi draws for it", () => {
  const tool = load().registered["tool render_diagram"];
  const kept = {
    content: [
      { type: "text", text: "Rendered flowchart diagram, 199x64." },
      { type: "image", data: "", mimeType: "image/png" },
    ],
    details: undefined,
  };

  const view = tool.renderResult(
    kept,
    { expanded: false },
    plainTheme,
    callState(),
  );

  assert.deepEqual(rendered(view), [" Rendered flowchart diagram, 199x64."]);
});

test("a diagram that does not parse is reported in the error color", () => {
  const tool = load().registered["tool render_diagram"];
  const failed = {
    content: [{ type: "text", text: "Parse error on line 2:\n  A --> [oops" }],
    details: undefined,
  };

  const view = tool.renderResult(
    failed,
    { expanded: false },
    namingTheme,
    callState({ isError: true }),
  );

  assert.deepEqual(rendered(view), [
    " <error>Parse error on line 2:",
    " <error>  A --> [oops",
  ]);
});

test("/pele shows the last assistant message's diagrams", async () => {
  const { registered, appended } = load();
  const { ctx, notices } = sessionWith(
    { role: "assistant", text: fence('pie\n  title Old\n  "a": 1') },
    { role: "user", text: "And as a flowchart?" },
    { role: "assistant", text: `Here:\n\n${fence(FLOWCHART)}` },
    { role: "user", text: fence("sequenceDiagram\n  A->>B: hi") },
  );

  await registered["command pele"].handler("", ctx);

  assert.deepEqual(notices, []);
  assert.deepEqual(
    appended.map(({ customType, data }) => ({
      customType,
      type: (data as { type: string }).type,
    })),
    [{ customType: "pele-diagram", type: "flowchart" }],
  );
  const [{ data } = { data: undefined }] = appended;
  assert.equal(
    decode(Buffer.from((data as { png: string }).png, "base64")).corner,
    TERMINAL_BACKGROUND,
  );
});

test("/pele says so when the last assistant message has no diagram", async () => {
  const { registered, appended } = load();
  const { ctx, notices } = sessionWith(
    { role: "assistant", text: fence(FLOWCHART) },
    { role: "assistant", text: "No diagram this time." },
  );

  await registered["command pele"].handler("", ctx);

  assert.deepEqual(appended, []);
  assert.deepEqual(notices, [
    {
      message: "No Mermaid diagrams in the last assistant message.",
      level: "info",
    },
  ]);
});

test("/pele says so before any assistant message", async () => {
  const { registered } = load();
  const { ctx, notices } = sessionWith();

  await registered["command pele"].handler("", ctx);

  assert.deepEqual(notices, [
    {
      message: "No Mermaid diagrams in the last assistant message.",
      level: "info",
    },
  ]);
});

test("/pele reports a diagram that does not parse", async () => {
  const { registered, appended } = load();
  const { ctx, notices } = sessionWith({
    role: "assistant",
    text: `${fence(FLOWCHART)}\n\n${fence("flowchart LR\n  A --> [oops")}`,
  });

  await registered["command pele"].handler("", ctx);

  assert.equal(appended.length, 1);
  assert.equal(notices.length, 1);
  assert.equal(notices[0]?.level, "error");
  assert.match(notices[0]?.message ?? "", /^Diagram 2: Parse error on line 2:/);
});

test("a kept diagram is drawn as a figure", () => {
  const renderer = load().registered["entry pele-diagram"];
  const png = Buffer.from("stands in for a PNG").toString("base64");

  const component = renderer(
    { type: "custom", customType: "pele-diagram", data: { type: "pie", png } },
    { expanded: false },
    plainTheme,
  );

  assert.ok(component instanceof Figure);
});
