import { rgbColor } from "@earendil-works/pi-tui";

import type { Session } from "../src/pi-theme.ts";

/**
 * A Pi session in the terminal UI, themed with colors no fixed theme uses.
 * Its theme is not one Pi made, so Pi has no page color for it and a diagram
 * takes the panel color, `0a141e` in a PNG, for its background.
 */
export function terminalSession(cwd: string): Session {
  return {
    cwd,
    mode: "tui",
    ui: {
      theme: {
        colors: {
          toolPendingBg: rgbColor(10, 20, 30),
          text: rgbColor(240, 240, 240),
          muted: rgbColor(150, 150, 150),
          borderMuted: rgbColor(90, 90, 90),
          accent: rgbColor(36, 131, 123),
          error: rgbColor(175, 48, 41),
        },
      },
    },
  };
}

/** A Pi session with no terminal UI, where reading the theme throws. */
export function headlessSession(cwd: string): Session {
  return {
    cwd,
    mode: "print",
    ui: {
      get theme(): never {
        throw new Error("Theme not initialized. Call initTheme() first.");
      },
    },
  };
}
