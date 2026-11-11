import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  discoverAndLoadExtensions,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { Image } from "@earendil-works/pi-tui";

import extension from "../extension.ts";
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

test("render_diagram shows a diagram in the session's theme", async () => {
  const tool = load().registered["tool render_diagram"];

  const result = await tool.execute(
    "call-1",
    { source: FLOWCHART },
    undefined,
    undefined,
    terminalSession("/"),
  );

  assert.equal(result.content[0].text, "Rendered flowchart diagram, 199x64.");
  assert.equal(
    decode(Buffer.from(result.content[1].data, "base64")).corner,
    TERMINAL_BACKGROUND,
  );
});

test("render_diagram's call line names the diagram, not its whole source", () => {
  const tool = load().registered["tool render_diagram"];

  const line = tool.renderCall({ source: FLOWCHART }, plainTheme);

  assert.deepEqual(
    line.render(80).map((row: string) => row.trimEnd()),
    ["render_diagram flowchart LR"],
  );
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

test("a kept diagram is drawn as an image", () => {
  const renderer = load().registered["entry pele-diagram"];
  const png = Buffer.from("stands in for a PNG").toString("base64");

  const component = renderer(
    { type: "custom", customType: "pele-diagram", data: { type: "pie", png } },
    { expanded: false },
    plainTheme,
  );

  assert.ok(component instanceof Image);
});
