# AGENTS.md

Guidance for coding agents working in this repository. Read [CONTRIBUTING.md](CONTRIBUTING.md) too.

## Layout

- `extension.ts`: the Pi extension entry. It registers the `render_diagram` tool, the `/pele` command, and the renderer for the diagrams `/pele` keeps in a session.
- `src/tool.ts`, `src/command.ts`: what the tool and the command do, written against the small part of Pi's context they read.
- `src/diagram.ts`, `src/static-svg.ts`: Mermaid text to a standalone SVG. Pele's SVG is styled with CSS variables, which `static-svg.ts` resolves so a rasterizer can draw it.
- `src/rasterize.ts`, `src/preview.ts`: SVG to PNG with resvg, and the PNG a session shows inline.
- `src/themes.ts`, `src/pi-theme.ts`: the fixed light and dark themes, and the mapping from a Pi theme to Pele's variables.
- `src/fences.ts`: finds Mermaid code fences in Markdown.
- `test/`: tests named for the source file they cover, plus `samples.ts`, a diagram of each type Pele supports.
- `scripts/check-package-contents.mjs`: the published file list.

## Commands

```sh
npm ci
npm run check
npm run lint:fix
```

## Rules

- Write the failing test first for a behavior change.
- Import Pi only through `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `@earendil-works/pi-ai`, and `typebox`. Pi provides them at runtime, so they stay in `peerDependencies`, never `dependencies`.
- Keep rendering in-process and offline: no browser, no network request, no external command.
- A new file under `src/` ships only when `scripts/check-package-contents.mjs` lists it.
- Do not publish packages, push tags, or merge pull requests.
