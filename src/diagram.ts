import { render } from "pele";

import { staticSvg, type ThemeVariables } from "./static-svg.ts";

/** A rendered diagram: a standalone SVG and its size in CSS pixels. */
export interface Diagram {
  readonly svg: string;
  readonly width: number;
  readonly height: number;
  /** Pele's name for the diagram type, such as `flowchart` or `sequence`. */
  readonly type: string;
}

/**
 * Render Mermaid source to a standalone SVG colored by `theme`.
 *
 * Throws Pele's `PeleError` for source it cannot draw; its message already
 * carries the line and a pointer into the offending source.
 */
export function renderDiagram(source: string, theme: ThemeVariables): Diagram {
  const { svg, width, height, type } = render(source, {
    // A fixed size, not one that tracks a container's width: the SVG is
    // rasterized or saved, never laid out in a page.
    responsive: false,
    // Nothing here fetches a URL, so a linked image could only render as a
    // hole. Without images Pele still draws the node's label.
    images: false,
  });
  return { svg: staticSvg(svg, theme), width, height, type };
}

/**
 * Widen a diagram's canvas to at least `minWidth`, keeping the drawing at its
 * size and at the left edge, where a terminal's other content starts.
 *
 * A terminal draws an image at a fixed number of columns however small the
 * image is. A two-node diagram stretched to that width fills the screen with
 * two enormous boxes; on a canvas about as wide as the columns it is given, it
 * is drawn near its natural size instead.
 */
export function widen(diagram: Diagram, minWidth: number): Diagram {
  if (diagram.width >= minWidth) return diagram;

  const { width, height } = diagram;
  const canvas = `viewBox="0 0 ${width} ${height}" width="${width}"`;
  const start = diagram.svg.indexOf(canvas);
  if (start === -1 || start > diagram.svg.indexOf(">")) {
    throw new Error(
      `Expected Pele's SVG to open with ${canvas}, got: ${diagram.svg.slice(0, 120)}`,
    );
  }
  const widened = `viewBox="0 0 ${minWidth} ${height}" width="${minWidth}"`;
  return {
    ...diagram,
    svg:
      diagram.svg.slice(0, start) +
      widened +
      diagram.svg.slice(start + canvas.length),
    width: minWidth,
  };
}
