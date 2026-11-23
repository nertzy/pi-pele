# Changelog

Notable changes to `pi-pele` are documented here.

## [Unreleased]

### Added

- Added the `render_diagram` tool, which renders Mermaid text or a Mermaid file with Pele, shows the diagram inline in the Pi theme's colors, and optionally writes it to an SVG or PNG file in a chosen theme. The diagram is shown as a figure with no tool box around it, and the model is sent text about it, not the image.
- Added the `/pele` command, which shows the Mermaid diagrams in the last assistant message as images.
- `render_diagram` and `/pele` draw a diagram at its own size, shrunk only to fit the terminal. Where pi-galley is installed, a wide diagram runs past its column.
