import assert from "node:assert/strict";
import { test } from "node:test";

import { rgbColor } from "@earendil-works/pi-tui";

import { piThemeVariables } from "../src/pi-theme.ts";
import { FONTS } from "../src/themes.ts";

test("colors a diagram from the Pi theme's tokens", () => {
  const variables = piThemeVariables({
    colors: {
      toolPendingBg: rgbColor(200, 200, 200),
      text: rgbColor(0, 0, 0),
      muted: rgbColor(90, 90, 90),
      borderMuted: rgbColor(150, 150, 150),
      accent: rgbColor(36, 131, 123),
      error: rgbColor(175, 48, 41),
    },
  });

  assert.deepEqual(variables, {
    ...FONTS,
    "--pele-bg": "#c8c8c8",
    "--pele-fg": "#000000",
    "--pele-muted": "#5a5a5a",
    "--pele-line": "#000000",
    // The panel color stepped 6% and 12% of the way to the text color.
    "--pele-surface": "#bcbcbc",
    "--pele-surface-alt": "#b0b0b0",
    "--pele-border": "#969696",
    "--pele-accent": "#24837b",
    "--pele-critical": "#af3029",
  });
});

test("steps fills lighter than the panel in a dark theme", () => {
  const variables = piThemeVariables({
    colors: {
      toolPendingBg: rgbColor(50, 50, 50),
      text: rgbColor(250, 250, 250),
      muted: rgbColor(160, 160, 160),
      borderMuted: rgbColor(120, 120, 120),
      accent: rgbColor(124, 156, 240),
      error: rgbColor(228, 87, 86),
    },
  });

  assert.equal(variables["--pele-surface"], "#3e3e3e");
  assert.equal(variables["--pele-surface-alt"], "#4a4a4a");
});
