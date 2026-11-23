import {
  type Component,
  getCellDimensions,
  getPngDimensions,
  Image,
  type ImageDimensions,
  type ImageOptions,
  type ImageTheme,
} from "@earendil-works/pi-tui";

// pi-galley sets a session's transcript in a column and draws tool images at
// Pi's fixed width. It reads these global symbols from other extensions'
// components, so using them needs no dependency on it, and they do nothing
// where it is not installed.

/** `true` on a rendered component keeps its transcript block full width. */
const FULL_WIDTH: unique symbol = Symbol.for("pi-galley.full-width");
/** `"natural"` on a tool's rendered component draws its images unscaled. */
const IMAGE_WIDTH: unique symbol = Symbol.for("pi-galley.image-width");
/** A function on `globalThis` for as long as pi-galley is loaded. */
const MEASURE: unique symbol = Symbol.for("pi-galley.measure");

/**
 * Mark a tool's call line so pi-galley draws the tool's images at their own
 * size, in a block as wide as the terminal: a wide diagram gets the room it
 * needs, and a small one is not stretched. Without pi-galley, Pi draws them at
 * its `terminal.imageWidthCells` setting.
 */
export function atNaturalSize<Line extends Component>(line: Line): Line {
  return Object.assign(line, { [IMAGE_WIDTH]: "natural", [FULL_WIDTH]: true });
}

type Size = Pick<ImageOptions, "maxWidthCells" | "maxHeightCells">;

/** No limits of our own: Pi's `Image` then draws at most 60 cells wide. */
const PI_SIZE: Size = {};

/**
 * A diagram `/pele` kept in the session. pi-galley sizes only the images Pi
 * draws for a tool, and this one is ours, so it sizes itself the same way
 * when pi-galley is loaded.
 */
export class KeptDiagram implements Component {
  readonly [FULL_WIDTH] = true;
  readonly #png: string;
  readonly #theme: ImageTheme;
  readonly #dimensions: ImageDimensions | null;
  #size = PI_SIZE;
  #image: Image;

  /** `png` is the diagram as a base64 PNG. */
  constructor(png: string, theme: ImageTheme) {
    this.#png = png;
    this.#theme = theme;
    this.#dimensions = getPngDimensions(png);
    this.#image = new Image(png, "image/png", theme, PI_SIZE);
  }

  render(width: number): string[] {
    // Checked on every draw: pi-galley can load, and the terminal's font can
    // change, after the diagram was first drawn.
    const size =
      this.#dimensions && MEASURE in globalThis
        ? naturalSize(this.#dimensions)
        : PI_SIZE;
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
