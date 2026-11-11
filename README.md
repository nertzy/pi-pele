# pi-pele

Render Mermaid diagrams in [Pi](https://github.com/earendil-works/pi) with [Pele](https://pele.run), Obsidian's Mermaid-to-SVG renderer. Diagrams appear inline in the session, colored to match your Pi theme, and can be written to SVG or PNG files. Rendering happens in-process: no browser, no network, no external command.

## Install

```sh
pi install git:github.com/nertzy/pi-pele
```

Run `/reload` in existing sessions, or start a new one. It needs Node.js 24 or later.

## Render a diagram

The `render_diagram` tool lets the model draw a diagram and see the result. Ask for one:

```text
Draw a sequence diagram of the login flow in src/auth.
```

The model writes the Mermaid text, the tool renders it, and the image appears under the tool call. A syntax error comes back with its line and a pointer into the source, so the model can fix it and try again.

| Argument | Meaning                                                        |
| -------- | -------------------------------------------------------------- |
| `source` | Mermaid diagram text. Give this or `path`.                     |
| `path`   | A file of Mermaid diagram text. Give this or `source`.         |
| `output` | A file to write, ending in `.svg` or `.png`. Requires `theme`. |
| `theme`  | `pi`, `light`, or `dark`. See [Themes](#themes).               |
| `scale`  | Pixels per diagram unit in a PNG `output`. Default 2.          |

## Show a reply's diagrams

When a reply contains Mermaid code fences, run `/pele` to see them drawn:

```text
/pele
```

It renders every Mermaid fence in the last assistant message. The images are for you: they are kept in the session for display and never sent to the model.

## Themes

A diagram that is only viewed in the session takes its colors from the active Pi theme, so it looks like part of the conversation. Where Pi has no terminal UI (print, JSON, and RPC modes) it uses the light theme.

A diagram written to a file is shown somewhere else, such as a README or a slide, where the session's colors mean nothing. Writing one therefore requires a `theme`, and the model is told to choose `light` or `dark` from where the file will be displayed. Choose `pi` to keep the session's colors in the file.

A diagram's own `themeVariables`, set in its front matter or an `init` directive, take precedence over all three.

## Scope and limitations

- Pele draws the diagrams, not Mermaid.js. It supports many but not all Mermaid diagram types, and its layouts differ. [Pele's documentation](https://pele.run) lists what it supports.
- Inline images need a terminal that Pi can draw images in, such as Ghostty, Kitty, WezTerm, or iTerm2. Elsewhere Pi shows a text placeholder, and writing files still works.
- Pele sizes labels for a Helvetica-like font. PNGs are drawn with the first installed font of Arial, Helvetica, Liberation Sans, DejaVu Sans, and Noto Sans, so on a system with none of them labels may not fit their boxes.
- Images that a diagram links to are not fetched or embedded. The node keeps its label.
- An SVG file has its colors written in, so it does not adapt to a page's light or dark mode the way Pele's own output can.
- A `/pele` image keeps the colors of the theme that was active when it was drawn.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE). Pele is MIT licensed, and the [resvg-js](https://github.com/thx/resvg-js) rasterizer is MPL-2.0.
