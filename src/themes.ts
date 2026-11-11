import type { ThemeVariables } from "./static-svg.ts";

// Pele sizes each label from a built-in table of Helvetica-like glyph widths,
// so the text has to be drawn in a font with those metrics to fit its box.
// The families are named because a rasterizer has no browser to map the
// generic `sans-serif` and `monospace` to an installed font: resvg falls back
// to an arbitrary one. Each list runs macOS, Windows, then common Linux fonts.
export const FONTS: ThemeVariables = {
  "--pele-font":
    "Arial, Helvetica, Liberation Sans, DejaVu Sans, Noto Sans, sans-serif",
  "--pele-font-mono":
    "Menlo, Consolas, Liberation Mono, DejaVu Sans Mono, Noto Sans Mono, Courier New, monospace",
};

/**
 * Fixed themes, for a diagram that should not depend on where it was drawn,
 * such as a file bound for documentation. Light sets no colors: Pele's
 * defaults are its light theme. Series colors are left to Pele in both, since
 * its default palette reads on either background.
 */
export const THEMES: Readonly<Record<"light" | "dark", ThemeVariables>> = {
  light: FONTS,
  dark: {
    ...FONTS,
    "--pele-bg": "#1e1e1e",
    "--pele-fg": "#e6e6e6",
    "--pele-muted": "#a0a0a0",
    "--pele-line": "#c8c8c8",
    "--pele-surface": "#2b2b2b",
    "--pele-surface-alt": "#383838",
    "--pele-border": "#707070",
    "--pele-accent": "#7c9cf0",
  },
};
