import PaintContext from "./PaintContext";
import { Matrix3x3 } from "parsegraph-matrix";
import Camera from "parsegraph-camera";
import Rect from "parsegraph-rect";

export type Counts = { [key: string]: number };

export default interface Artist {
  /**
   * Given the counts, install painters into the context, and
   * prepare them for painting.
   *
   * During painting, this is called immediately after each Painted's
   * .draft() method is called.
   *
   * @param {ctx} the target context
   * @param {counts} a map of counts
   */
  setup(ctx: PaintContext, counts: Counts): void;

  /**
   * Returns the bounds of painting, in world space.
   *
   * @return {Rect} the bounds of all objects rendered using this context.
   */
  bounds(ctx: PaintContext): Rect;

  contextChanged(ctx: PaintContext, isLost: boolean): void;

  tick(ctx: PaintContext, elapsed: number): boolean;

  unmount(ctx: PaintContext): void;

  /**
   * Renders the painted content.
   *
   * @param world the 3x3 world matrix
   * @param scale the scale of the world matrix
   * @param forceSimple if true, this is a hint to draw low-resolution models
   * @param {camera} the camera used for rendering
   * @param paintContext component used for rendering
   */
  render(
    world: Matrix3x3,
    scale: number,
    forceSimple: boolean,
    camera: Camera,
    ctx: PaintContext
  ): void;
}
