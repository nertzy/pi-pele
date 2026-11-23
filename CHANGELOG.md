# Changelog

Notable changes to `pi-pele` are documented here.

## [Unreleased]

### Added

- Added the `render_diagram` tool, which renders Mermaid text or a Mermaid file with Pele, shows the diagram inline in the Pi theme's colors, and optionally writes it to an SVG or PNG file in a chosen theme.
- Added the `/pele` command, which shows the Mermaid diagrams in the last assistant message as images.
- With pi-galley 0.2.0 or later installed, `render_diagram` and `/pele` draw a diagram at its own size in a block as wide as the terminal, so a wide diagram is no longer shrunk to Pi's image width.
