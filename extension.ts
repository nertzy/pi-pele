import {
  defineTool,
  type ExtensionAPI,
  type SessionEntry,
} from "@earendil-works/pi-coding-agent";
import { Image, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

import { type DiagramEntry, renderFences } from "./src/command.ts";
import { callSummary, renderDiagramCall } from "./src/tool.ts";

/** The session entry type that keeps a `/pele` diagram on screen. */
const ENTRY = "pele-diagram";

const renderDiagramTool = defineTool({
  name: "render_diagram",
  label: "Render Diagram",
  description:
    "Render a Mermaid diagram with Pele and show it inline as an image. Give the Mermaid text as `source`, or a file of it as `path`. Set `output` to also write an SVG or PNG file. A syntax error reports its line and points into the source.",
  promptSnippet:
    "Render a Mermaid diagram as an inline image, or to an SVG or PNG file",
  promptGuidelines: [
    "Use render_diagram to show a Mermaid diagram as an image when a picture explains structure or flow better than prose, and to check a diagram you wrote before relying on it.",
    "When render_diagram writes a file for use outside this session (a README, docs, a commit), choose its theme from that destination: check the project's existing images and where the file is displayed. This session's theme says nothing about it.",
  ],
  parameters: Type.Object({
    source: Type.Optional(
      Type.String({
        description: "Mermaid diagram text. Omit when `path` is set.",
      }),
    ),
    path: Type.Optional(
      Type.String({
        description: "File of Mermaid diagram text. Omit when `source` is set.",
      }),
    ),
    output: Type.Optional(
      Type.String({
        description:
          "File to write, ending in .svg or .png. Requires `theme`. Omit to only view the diagram.",
      }),
    ),
    theme: Type.Optional(
      Type.Enum(["pi", "light", "dark"], {
        // Some providers reject an `enum` that does not state its type.
        type: "string",
        description:
          "Colors. Omit when only viewing: the diagram then matches this session's Pi theme. With `output`, choose `light` or `dark` to suit where the file is shown, or `pi` to keep this session's colors.",
      }),
    ),
    scale: Type.Optional(
      Type.Number({
        description:
          "Pixels per diagram unit in a PNG `output`. Default 2. An SVG has no pixels to scale.",
        exclusiveMinimum: 0,
      }),
    ),
  }),
  execute: (_toolCallId, params, _signal, _onUpdate, ctx) =>
    renderDiagramCall(params, ctx),
  renderCall: (args, theme) =>
    new Text(
      `${theme.fg("toolTitle", theme.bold("render_diagram"))} ${theme.fg("muted", callSummary(args))}`,
      0,
      0,
    ),
});

export default function pele(pi: ExtensionAPI): void {
  pi.registerTool(renderDiagramTool);

  pi.registerEntryRenderer<DiagramEntry>(ENTRY, (entry, _options, theme) =>
    entry.data
      ? new Image(entry.data.png, "image/png", {
          fallbackColor: (text) => theme.fg("muted", text),
        })
      : undefined,
  );

  pi.registerCommand("pele", {
    description: "Show the last assistant message's Mermaid diagrams as images",
    handler: async (_args, ctx) => {
      const { diagrams, failures } = renderFences(
        lastAssistantText(ctx.sessionManager.getBranch()),
        ctx,
      );

      for (const diagram of diagrams) pi.appendEntry(ENTRY, diagram);
      for (const failure of failures) ctx.ui.notify(failure, "error");
      if (diagrams.length === 0 && failures.length === 0) {
        ctx.ui.notify(
          "No Mermaid diagrams in the last assistant message.",
          "info",
        );
      }
    },
  });
}

/** The text of the newest assistant message on the branch, or `""`. */
function lastAssistantText(branch: SessionEntry[]): string {
  for (const entry of branch.toReversed()) {
    if (entry.type !== "message" || entry.message.role !== "assistant")
      continue;
    return entry.message.content
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join("\n\n");
  }
  return "";
}
