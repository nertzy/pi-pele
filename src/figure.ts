import {
  type Component,
  getCellDimensions,
  getPngDimensions,
  Image,
  type ImageDimensions,
  type ImageOptions,
  type ImageTheme,
} from "@earendil-works/pi-tui";

/**
 * pi-galley sets a session's transcript in a column. `true` under this global
 * symbol on a rendered component keeps its block as wide as the terminal.
 * Setting it needs no dependency on pi-galley, and it does nothing where
 * pi-galley is not installed.
 */
const FULL_WIDTH: unique symbol = Symbol.for("pi-galley.full-width");

type Size = Pick<ImageOptions, "maxWidthCells" | "maxHeightCells">;

/**
 * A diagram drawn in the transcript as a figure: at its own size, as text is,
 * not scaled to a fixed width. A small diagram is not stretched, and a wide one
 * takes the room it needs, shrinking only to fit the terminal.
 */
export class Figure implements Component {
  readonly [FULL_WIDTH] = true;
  readonly #png: string;
  readonly #theme: ImageTheme;
  readonly #dimensions: ImageDimensions | null;
  #size: Size = {};
  #image: Image;

  /** `png` is the diagram as a base64 PNG. */
  constructor(png: string, theme: ImageTheme) {
    this.#png = png;
    this.#theme = theme;
    this.#dimensions = getPngDimensions(png);
    this.#image = new Image(png, "image/png", theme, this.#size);
  }

  render(width: number): string[] {
    // Measured on every draw: the terminal's font can change after the figure
    // was first drawn.
    const size = this.#dimensions ? naturalSize(this.#dimensions) : {};
    if (
      size.maxWidthCells !== this.#size.maxWidthCells ||
      size.maxHeightCells !== this.#size.maxHeightCells
    ) {
      this.#size = size;
      this.#image = new Image(this.#png, "image/png", this.#theme, {
        ...size,
        // Replace the image the terminal holds instead of adding one.
        imageId: this.#image.getImageId(),
      });
    }
    return this.#image.render(width);
  }

  invalidate(): void {
    this.#image.invalidate();
  }
}

/**
 * One image pixel per terminal pixel, in whole cells: rounded down across so
 * the image shrinks rather than grows, and tall enough to hold it. Pi's own
 * height limit would shrink a tall image into a box as high as it is wide.
 */
function naturalSize({ widthPx, heightPx }: ImageDimensions): Size {
  const cell = getCellDimensions();
  return {
    maxWidthCells: Math.max(1, Math.floor(widthPx / cell.widthPx)),
    maxHeightCells: Math.max(1, Math.ceil(heightPx / cell.heightPx)),
  };
}
