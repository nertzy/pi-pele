import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { Theme } from "@earendil-works/pi-coding-agent";
import { colorToHex, rgbColor } from "@earendil-works/pi-tui";

import { pageColor, piThemeVariables } from "../src/pi-theme.ts";
import { FONTS } from "../src/themes.ts";
import { terminalSession } from "./sessions.ts";

test("colors a diagram from the Pi theme's tokens and the page", () => {
  const variables = piThemeVariables(
    {
      colors: {
        toolPendingBg: rgbColor(180, 180, 180),
        text: rgbColor(0, 0, 0),
        muted: rgbColor(90, 90, 90),
        borderMuted: rgbColor(150, 150, 150),
        accent: rgbColor(36, 131, 123),
        error: rgbColor(175, 48, 41),
      },
    },
    rgbColor(200, 200, 200),
  );

  assert.deepEqual(variables, {
    ...FONTS,
    "--pele-bg": "#c8c8c8",
    "--pele-fg": "#000000",
    "--pele-muted": "#5a5a5a",
    "--pele-line": "#000000",
    // The page color stepped 6% and 12% of the way to the text color.
    "--pele-surface": "#bcbcbc",
    "--pele-surface-alt": "#b0b0b0",
    "--pele-border": "#969696",
    "--pele-accent": "#24837b",
    "--pele-critical": "#af3029",
  });
});

test("steps fills lighter than the page in a dark theme", () => {
  const variables = piThemeVariables(
    {
      colors: {
        toolPendingBg: rgbColor(70, 70, 70),
        text: rgbColor(250, 250, 250),
        muted: rgbColor(160, 160, 160),
        borderMuted: rgbColor(120, 120, 120),
        accent: rgbColor(124, 156, 240),
        error: rgbColor(228, 87, 86),
      },
    },
    rgbColor(50, 50, 50),
  );

  assert.equal(variables["--pele-surface"], "#3e3e3e");
  assert.equal(variables["--pele-surface-alt"], "#4a4a4a");
});

/**
 * A theme Pi made, with the few tokens its constructor insists on. None of
 * them is the page: Pi themes have no token for it.
 */
function piTheme(): Theme {
  return new Theme(
    {
      text: "#f0f0f0",
      muted: "#969696",
      borderMuted: "#5a5a5a",
      accent: "#24837b",
      error: "#af3029",
      thinkingXhigh: "#24837b",
    } as never,
    { toolPendingBg: "#0a141e", selectedBg: "#14283c" } as never,
    "truecolor",
  );
}

let colorFgBg: string | undefined;
beforeEach(() => {
  colorFgBg = process.env.COLORFGBG;
});
afterEach(() => {
  if (colorFgBg === undefined) delete process.env.COLORFGBG;
  else process.env.COLORFGBG = colorFgBg;
});

// No terminal answers a color query in a test, so what Pi knows of the page
// is its guess from the terminal's appearance. A terminal that answers gives
// its real background the same way.
test("reads the page color Pi goes by, in a light terminal", () => {
  process.env.COLORFGBG = "0;15";

  const page = pageColor(piTheme());

  assert.ok(page);
  assert.equal(colorToHex(page), "#ffffff");
});

test("reads the page color Pi goes by, in a dark terminal", () => {
  process.env.COLORFGBG = "15;0";

  const page = pageColor(piTheme());

  assert.ok(page);
  assert.equal(colorToHex(page), "#000000");
});

test("has no page color for a theme Pi did not make", () => {
  assert.equal(pageColor(terminalSession("/").ui.theme), undefined);
});
