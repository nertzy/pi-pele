/** Values for Pele's `--pele-*` CSS variables, keyed by variable name. */
export type ThemeVariables = Readonly<Record<string, string>>;

// Pele writes ">" inside attribute values and text as "&gt;", so a raw ">"
// always ends a tag and this cannot stop short inside an attribute.
const TAG = /<[^>]*>/g;
const ROOT = /^\s*<svg\b[^>]*>/;
const STYLE = / style="([^"]*)"/;
// A declaration ends at ";", except the ";" that ends a character reference
// such as the "&quot;" around a quoted font family.
const DECLARATION = /(?:&#?\w+;|[^;])+/g;
const HEX = "#(?:[0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-f])";
const COLOR_MIX = new RegExp(
  `color-mix\\(in srgb,\\s*(${HEX})(?:\\s+([\\d.]+)%)?\\s*,\\s*(${HEX})(?:\\s+([\\d.]+)%)?\\s*\\)`,
  "gi",
);
// Geometry that SVG 2 lets CSS set but that only browsers read from CSS.
const GEOMETRY = new Set(["rx", "ry"]);

/**
 * Rewrite a Pele SVG so it renders the same without a CSS engine.
 *
 * Pele themes its output with CSS custom properties: the root element aliases
 * each `--pele-*` variable to a short internal one (`--_bg:var(--pele-bg,#fff)`)
 * and every shape refers to those. A browser resolves them, which is what lets
 * a page restyle a diagram without re-rendering it. Rasterizers and most other
 * SVG consumers do not, and paint an unresolved `var()` black. This resolves
 * every reference against `variables` (the theme) and the root's definitions,
 * computes the `color-mix()` Pele derives nested-subgraph borders with, moves
 * CSS-only geometry onto attributes, and paints the theme's background, which
 * Pele otherwise leaves to the page.
 *
 * Only markup is rewritten. A label that quotes `var(--x)` is text, and stays.
 */
export function staticSvg(svg: string, variables: ThemeVariables): string {
  const root = ROOT.exec(svg)?.[0];
  if (root === undefined) {
    throw new Error(
      `Expected an SVG document from Pele, got: ${svg.slice(0, 80)}`,
    );
  }

  // Pele defines its variables on the root only, so one scope serves the whole
  // document. The root's definitions win over the theme's: that is how a
  // diagram's own palette (`themeVariables` in its frontmatter) reaches CSS.
  const scope = new Map(Object.entries(variables));
  for (const declaration of declarations(root)) {
    if (declaration.property.startsWith("--")) {
      scope.set(declaration.property, declaration.value);
    }
  }

  const background =
    '<rect width="100%" height="100%" fill="var(--pele-bg,#fff)"/>';
  const document = root + background + svg.slice(root.length);
  return document.replace(TAG, (tag) =>
    restyle(mixColors(resolve(tag, scope)), tag === root),
  );
}

interface Declaration {
  property: string;
  value: string;
}

function declarations(tag: string): Declaration[] {
  const style = STYLE.exec(tag)?.[1] ?? "";
  return (style.match(DECLARATION) ?? []).flatMap((text) => {
    const colon = text.indexOf(":");
    if (colon === -1) return [];
    return {
      property: text.slice(0, colon).trim(),
      value: text.slice(colon + 1).trim(),
    };
  });
}

/**
 * Replace each `var(--name, fallback)` in `text` with the variable's value, or
 * with the fallback when the variable is unset. A reference that has neither
 * is left as written, as is one that would recurse into itself (`resolving`
 * holds the names being expanded).
 */
function resolve(
  text: string,
  scope: ReadonlyMap<string, string>,
  resolving: ReadonlySet<string> = new Set(),
): string {
  let resolved = "";
  let rest = 0;
  for (;;) {
    const start = text.indexOf("var(", rest);
    const end = start === -1 ? -1 : closingParenthesis(text, start + 3);
    if (end === -1) return resolved + text.slice(rest);

    // Everything after the first comma is the fallback, commas included: a
    // font-family list is a legal fallback.
    const argument = text.slice(start + 4, end);
    const comma = argument.indexOf(",");
    const name = (comma === -1 ? argument : argument.slice(0, comma)).trim();
    const fallback =
      comma === -1 ? undefined : argument.slice(comma + 1).trim();
    const value = resolving.has(name) ? undefined : scope.get(name);

    resolved += text.slice(rest, start);
    if (value !== undefined) {
      resolved += resolve(value, scope, new Set([...resolving, name]));
    } else if (fallback !== undefined) {
      resolved += resolve(fallback, scope, resolving);
    } else {
      resolved += text.slice(start, end + 1);
    }
    rest = end + 1;
  }
}

function closingParenthesis(text: string, open: number): number {
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === "(") depth++;
    else if (text[index] === ")" && --depth === 0) return index;
  }
  return -1;
}

/** Compute `color-mix(in srgb, …)` of two hex colors; leave any other mix. */
function mixColors(tag: string): string {
  return tag.replace(
    COLOR_MIX,
    (mix, first: string, firstShare, second: string, secondShare) => {
      const shares = colorShares(firstShare, secondShare);
      if (shares === undefined) return mix;
      const [a, b] = [channels(first), channels(second)];
      return `#${a
        .map((channel, index) =>
          Math.round(channel * shares.first + (b[index] ?? 0) * shares.second)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`;
    },
  );
}

/** CSS's rule: an omitted percentage is the remainder; a sum is normalized. */
function colorShares(first?: string, second?: string) {
  const a = first === undefined ? undefined : Number(first);
  const b = second === undefined ? undefined : Number(second);
  const firstShare = a ?? 100 - (b ?? 50);
  const secondShare = b ?? 100 - firstShare;
  const total = firstShare + secondShare;
  if (!(total > 0) || firstShare < 0 || secondShare < 0) return undefined;
  return { first: firstShare / total, second: secondShare / total };
}

function channels(hex: string): number[] {
  const digits = hex.slice(1);
  const full =
    digits.length === 3
      ? [...digits].map((digit) => digit + digit).join("")
      : digits;
  return [0, 2, 4].map((offset) =>
    parseInt(full.slice(offset, offset + 2), 16),
  );
}

/**
 * Rewrite a tag's style attribute now that its variables are resolved: drop
 * the root's variable definitions, which nothing refers to any more, and move
 * CSS-only geometry to the attributes of the same name. CSS wins over a
 * presentation attribute, so a moved value replaces an existing attribute.
 */
function restyle(tag: string, isRoot: boolean): string {
  if (!STYLE.test(tag)) return tag;

  const kept: string[] = [];
  let attributes = "";
  let restyled = tag;
  for (const { property, value } of declarations(tag)) {
    if (GEOMETRY.has(property)) {
      restyled = restyled.replace(new RegExp(` ${property}="[^"]*"`), "");
      attributes += ` ${property}="${value}"`;
    } else if (!(isRoot && property.startsWith("--"))) {
      kept.push(`${property}:${value}`);
    }
  }

  const style = kept.length === 0 ? "" : ` style="${kept.join(";")}"`;
  return restyled.replace(STYLE, () => style + attributes);
}
