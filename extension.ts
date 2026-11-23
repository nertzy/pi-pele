import {
  defineTool,
  type ExtensionAPI,
  type SessionEntry,
  type Theme,
} from "@earendil-works/pi-coding-agent";
import { Container, getCapabilities, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

import { type DiagramEntry, renderFences } from "./src/command.ts";
import { Figure } from "./src/figure.ts";
import {
  callSummary,
  type RenderDiagramDetails,
  renderDiagramCall,
} from "./src/tool.ts";

/** The session entry type that keeps a `/pele` diagram on screen. */
const ENTRY = "pele-diagram";

const figure = (png: string, theme: Theme) =>
  new Figure(png, { fallbackColor: (text) => theme.fg("muted", text) });

/** Text in one of the theme's colors, each line colored on its own. */
const colored = (
  theme: Theme,
  color: "muted" | "error",
  text: string,
  pad: number,
) =>
  new Text(
    text
      .split("\n")
      .map((line) => theme.fg(color, line))
      .join("\n"),
    pad,
    0,
  );

/** What Pi keeps for one `render_diagram` call between draws of it. */
interface Drawn {
  figure?: { readonly png: string; readonly component: Figure };
}

const renderDiagramTool = defineTool({
  name: "render_diagram",
  label: "Render Diagram",
  description:
    "Render a Mermaid diagram with Pele and show it to the user inline as an image. You get back its type and size, not the picture. Give the Mermaid text as `source`, or a file of it as `path`. Set `output` to also write an SVG or PNG file. A syntax error reports its line and points into the source.",
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
  // A diagram is a figure in the response, as the text art Pi draws for a
  // Mermaid fence is: on the page, with no tool box around it. Pi leaves the
  // box off a tool that draws its own shell.
  renderShell: "self",
  // One line stands in for the figure until it is there, and stays to say
  // what failed when it never arrives.
  renderCall: (args, theme, context) =>
    context.isPartial || context.isError
      ? colored(
          theme,
          "muted",
          `render_diagram ${callSummary(args)}`.trimEnd(),
          context.outputPad,
        )
      : new Container(),
  renderResult: (result, _options, theme, context) => {
    const text = result.content
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join("\n");
    if (context.isError) {
      return colored(theme, "error", text, context.outputPad);
    }

    // A call that failed, or that an earlier version kept with its image in
    // `content` for Pi to draw, has no details.
    const details = result.details as RenderDiagramDetails | undefined;
    const drawn: Drawn = context.state;
    const view = new Container();
    const shown =
      details !== undefined && context.showImages && getCapabilities().images;
    if (shown) {
      // Pi asks for the result again on every redraw. A new figure each time
      // would send the terminal the image again.
      if (drawn.figure?.png !== details.png) {
        drawn.figure = {
          png: details.png,
          component: figure(details.png, theme),
        };
      }
      view.addChild(drawn.figure.component);
    }
    // The figure says what was rendered; without one, the text has to.
    const caption = shown ? details.wrote : text;
    if (caption) {
      view.addChild(colored(theme, "muted", caption, context.outputPad));
    }
    return view;
  },
});

export default function pele(pi: ExtensionAPI): void {
  pi.registerTool(renderDiagramTool);

  pi.registerEntryRenderer<DiagramEntry>(ENTRY, (entry, _options, theme) =>
    entry.data ? figure(entry.data.png, theme) : undefined,
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
