const OPENING = /^([ \t]*)(`{3,}|~{3,})[ \t]*([^\s`]*)/;

interface OpenFence {
  indent: string;
  marker: string;
  mermaid: boolean;
  lines: string[];
}

/**
 * Bodies of the Mermaid code fences in a Markdown document, in order.
 *
 * Fence matching follows CommonMark closely enough for chat transcripts: a
 * fence closes on a run of its own character at least as long as the opening
 * run, so a longer fence can quote a shorter one. Other languages are tracked
 * too, because a `mermaid` line inside a fenced Markdown example is not a
 * diagram. A fence still open when the document ends is kept: a message cut
 * off mid-diagram is worth an attempt, and Pele reports what is missing.
 */
export function mermaidFences(markdown: string): string[] {
  const fences: string[] = [];
  let open: OpenFence | undefined;

  const close = (fence: OpenFence) => {
    if (!fence.mermaid) return;
    const body = fence.lines
      // A fence nested in a list item is indented with it; the diagram is not.
      .map((line) =>
        line.startsWith(fence.indent) ? line.slice(fence.indent.length) : line,
      )
      .join("\n")
      .trim();
    if (body !== "") fences.push(body);
  };

  for (const line of markdown.split(/\r?\n/)) {
    if (open) {
      if (closes(open, line)) {
        close(open);
        open = undefined;
      } else {
        open.lines.push(line);
      }
      continue;
    }

    const match = OPENING.exec(line);
    if (!match) continue;
    const [, indent = "", marker = "", language = ""] = match;
    open = {
      indent,
      marker,
      mermaid: language.toLowerCase() === "mermaid",
      lines: [],
    };
  }

  if (open) close(open);
  return fences;
}

function closes(fence: OpenFence, line: string): boolean {
  const run = line.trim();
  return (
    run.length >= fence.marker.length &&
    run === fence.marker.charAt(0).repeat(run.length)
  );
}
