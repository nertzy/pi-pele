import { type Color, colorToHex, mixColors } from "@earendil-works/pi-tui";

import type { ThemeVariables } from "./static-svg.ts";
import { FONTS, THEMES } from "./themes.ts";

/** The part of Pi's `Theme` a diagram is colored from. */
export interface PiTheme {
  readonly colors: Readonly<
    Record<
      "toolPendingBg" | "text" | "muted" | "borderMuted" | "accent" | "error",
      Color
    >
  >;
}

/** The part of Pi's extension context a render reads. */
export interface Session {
  readonly cwd: string;
  /** Pi's run mode; only `"tui"` has a theme on screen to match. */
  readonly mode: string;
  readonly ui: { readonly theme: PiTheme };
}

/**
 * Pele variables for a diagram looked at in this session: the Pi theme's
 * colors in the terminal UI, and the light theme where there is no UI.
 */
export function sessionThemeVariables(session: Session): ThemeVariables {
  // Outside the terminal UI Pi has no theme, and reading it throws.
  return session.mode === "tui"
    ? piThemeVariables(session.ui.theme)
    : THEMES.light;
}

/**
 * Pele variables that make a diagram look like part of the Pi theme.
 *
 * The diagram is drawn as a panel: its background is `toolPendingBg`, the
 * neutral panel color a tool call sits on before it has a result. Pi themes
 * have no token for the page behind the panels, because that is the
 * terminal's own background, which an extension cannot ask for; and a
 * transparent diagram is not an option, since Pele paints its background
 * color behind edge labels to interrupt the line under them.
 *
 * Pi has no tokens for a fill on a panel either, so node and subgraph fills
 * are the panel color stepped toward the text color, the same relationship
 * Pele's own defaults have to their background. That keeps them visible in
 * light and dark themes alike.
 */
export function piThemeVariables({ colors }: PiTheme): ThemeVariables {
  const toward = (amount: number) =>
    colorToHex(mixColors(colors.toolPendingBg, colors.text, amount, "srgb"));

  return {
    ...FONTS,
    "--pele-bg": colorToHex(colors.toolPendingBg),
    "--pele-fg": colorToHex(colors.text),
    "--pele-muted": colorToHex(colors.muted),
    "--pele-line": colorToHex(colors.text),
    "--pele-surface": toward(0.06),
    "--pele-surface-alt": toward(0.12),
    "--pele-border": colorToHex(colors.borderMuted),
    "--pele-accent": colorToHex(colors.accent),
    "--pele-critical": colorToHex(colors.error),
  };
}
