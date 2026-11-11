import { PeleError } from "pele";

import { renderDiagram } from "./diagram.ts";
import { mermaidFences } from "./fences.ts";
import { type Session, sessionThemeVariables } from "./pi-theme.ts";
import { previewPng } from "./preview.ts";

/** A diagram kept in the session for display only. */
export interface DiagramEntry {
  /** Pele's name for the kind of diagram, such as `flowchart`. */
  readonly type: string;
  /** The preview, as a base64 PNG. */
  readonly png: string;
}

export interface FenceRenders {
  readonly diagrams: DiagramEntry[];
  /** One message per fence that did not render, numbered as in the text. */
  readonly failures: string[];
}

/** Render every Mermaid fence in a Markdown text for viewing in the session. */
export function renderFences(markdown: string, session: Session): FenceRenders {
  const diagrams: DiagramEntry[] = [];
  const failures: string[] = [];
  const theme = sessionThemeVariables(session);

  mermaidFences(markdown).forEach((source, index) => {
    try {
      const diagram = renderDiagram(source, theme);
      diagrams.push({ type: diagram.type, png: previewPng(diagram) });
    } catch (error) {
      if (!(error instanceof PeleError)) throw error;
      failures.push(`Diagram ${index + 1}: ${error.message}`);
    }
  });
  return { diagrams, failures };
}
