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
