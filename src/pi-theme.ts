import { Theme } from "@earendil-works/pi-coding-agent";
import { type Color, colorToHex, mixColors } from "@earendil-works/pi-tui";

import type { Canvas, ThemeVariables } from "./static-svg.ts";
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

/** How a diagram is drawn: its colors, and what lies behind it. */
export interface Look {
  readonly theme: ThemeVariables;
  readonly canvas: Canvas;
}

/**
 * The look of a diagram this session shows.
 *
 * In the terminal UI a diagram is a figure on the terminal's page: the Pi
 * theme's colors on a clear canvas, so the page itself is its background.
 * That holds where the page is not one flat color, too, as in a translucent
 * window. Where there is no UI there is no page, so the diagram is the light
 * theme on its own painted background.
 */
export function sessionLook(session: Session): Look {
  // Outside the terminal UI Pi has no theme, and reading it throws.
  if (session.mode !== "tui") return { theme: THEMES.light, canvas: "painted" };

  const { theme } = session.ui;
  return {
    theme: piThemeVariables(
      theme,
      pageColor(theme) ?? theme.colors.toolPendingBg,
    ),
    canvas: "clear",
  };
}

/**
 * The color of the terminal's page as Pi knows it, or `undefined` when Pi
 * cannot say.
 *
 * Pi's themes color panels and text, and have no token for the page behind
 * them: that is the terminal's own background. Pi asks the terminal for it,
 * though, and gives it to any background token a theme leaves unset. So a
 * theme with every token unset reads the page back: the color the terminal
 * reported, or Pi's guess from the terminal's appearance when it reported
 * none.
 */
export function pageColor(theme: PiTheme): Color | undefined {
  // The tokens are the running Pi's, whichever version that is.
  const unset = Object.fromEntries(
    Object.keys(theme.colors).map((token) => [token, ""]),
  );
  try {
    return new Theme(
      unset as ConstructorParameters<typeof Theme>[0],
      {} as ConstructorParameters<typeof Theme>[1],
      "truecolor",
    ).colors.toolPendingBg;
  } catch {
    return undefined;
  }
}

/**
 * Pele variables that make a diagram look like part of the Pi theme, on a
 * page of the color `page`.
 *
 * A clear canvas alone would not do: Pele also fills with its background
 * color inside a diagram, behind an edge label to interrupt the line under
 * it, in a hollow marker, between the slices of a pie. Those have to be the
 * page's color to disappear into it.
 *
 * Pi has no tokens for a fill on the page either, so node and subgraph fills
 * are the page color stepped toward the text color, the same relationship
 * Pele's own defaults have to their background. That keeps them visible in
 * light and dark themes alike.
 */
export function piThemeVariables(
  { colors }: PiTheme,
  page: Color,
): ThemeVariables {
  const toward = (amount: number) =>
    colorToHex(mixColors(page, colors.text, amount, "srgb"));

  return {
    ...FONTS,
    "--pele-bg": colorToHex(page),
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
