import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

import type { ImageContent, TextContent } from "@earendil-works/pi-ai";
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";

import { type Diagram, renderDiagram } from "./diagram.ts";
import { type Session, sessionThemeVariables } from "./pi-theme.ts";
import { previewPng } from "./preview.ts";
import { rasterize } from "./rasterize.ts";
import type { ThemeVariables } from "./static-svg.ts";
import { THEMES } from "./themes.ts";

/** The `render_diagram` tool's arguments. */
export interface RenderDiagramParams {
  readonly source?: string;
  readonly path?: string;
  readonly output?: string;
  readonly theme?: "pi" | "light" | "dark";
  readonly scale?: number;
}

export interface RenderDiagramResult {
  readonly content: (TextContent | ImageContent)[];
  readonly details: undefined;
}

/** Device pixels per CSS pixel in a PNG file, unless the call sets `scale`. */
const FILE_SCALE = 2;
const FILE_MAX_SIDE = 8192;

/**
 * Render a diagram for the session to look at, and write it to a file when
 * `output` names one.
 *
 * A diagram that is only looked at matches the Pi theme. A file is shown
 * somewhere else (a README, a slide), where this session's colors mean
 * nothing, so writing one requires the caller to choose its theme.
 */
export async function renderDiagramCall(
  params: RenderDiagramParams,
  session: Session,
): Promise<RenderDiagramResult> {
  const { output } = params;
  if ((params.source === undefined) === (params.path === undefined)) {
    throw new Error("Expected exactly one of source and path.");
  }
  const format = output === undefined ? undefined : fileFormat(output);
  if (output !== undefined && params.theme === undefined) {
    throw new Error(
      `Expected theme with output. Choose "light" or "dark" to suit where ${output} will be shown, or "pi" to keep this session's colors.`,
    );
  }

  const source =
    params.source ??
    (await readFile(inCwd(session, params.path ?? ""), "utf8"));
  const diagram = renderDiagram(source, themeVariables(params.theme, session));
  const summary = [
    `Rendered ${diagram.type} diagram, ${diagram.width}x${diagram.height}.`,
  ];

  if (output !== undefined) {
    const written = await write(diagram, inCwd(session, output), {
      format,
      scale: params.scale ?? FILE_SCALE,
    });
    summary.push(`Wrote ${output}${written}.`);
  }

  return {
    content: [
      { type: "text", text: summary.join(" ") },
      { type: "image", data: previewPng(diagram), mimeType: "image/png" },
    ],
    details: undefined,
  };
}

/** One line that identifies a call while it runs, from whatever has arrived. */
export function callSummary(params: RenderDiagramParams): string {
  const subject = params.path ?? openingLine(params.source ?? "");
  const target = params.output === undefined ? "" : ` → ${params.output}`;
  const theme = params.theme === undefined ? "" : ` (${params.theme})`;
  return `${subject}${target}${theme}`;
}

type FileFormat = "svg" | "png";

function fileFormat(output: string): FileFormat {
  const extension = extname(output).toLowerCase();
  if (extension === ".svg") return "svg";
  if (extension === ".png") return "png";
  throw new Error(`Expected output to end in .svg or .png, got ${output}`);
}

/** Resolve a path argument, less the `@` some models prefix paths with. */
function inCwd(session: Session, path: string): string {
  return resolve(session.cwd, path.replace(/^@/, ""));
}

function themeVariables(
  theme: RenderDiagramParams["theme"],
  session: Session,
): ThemeVariables {
  return theme === "light" || theme === "dark"
    ? THEMES[theme]
    : sessionThemeVariables(session);
}

/**
 * Write the diagram at its own size, and say what a reader of the result
 * cannot tell from the diagram's size alone: a PNG's size in pixels.
 */
async function write(
  diagram: Diagram,
  file: string,
  { format, scale }: { format: FileFormat | undefined; scale: number },
): Promise<string> {
  const raster =
    format === "png"
      ? rasterize(diagram, { scale, maxSide: FILE_MAX_SIDE })
      : undefined;

  await mkdir(dirname(file), { recursive: true });
  await withFileMutationQueue(file, () =>
    writeFile(file, raster?.png ?? diagram.svg),
  );
  return raster ? `, ${raster.width}x${raster.height} pixels` : "";
}

/** The line that declares the diagram's type, past front matter and comments. */
function openingLine(source: string): string {
  const lines = source.split("\n").map((line) => line.trim());
  const frontMatterEnd = lines[0] === "---" ? lines.indexOf("---", 1) : -1;
  return (
    lines
      .slice(frontMatterEnd + 1)
      .find((line) => line !== "" && !line.startsWith("%%")) ?? ""
  );
}
