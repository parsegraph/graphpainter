import { Projector } from "parsegraph-projector";
import { Renderable } from "parsegraph-timingbelt";
import NodeValues from "./NodeValues";
import Transformed from "./Transformed";

export type WorldRenderable = Renderable & Transformed;

export default interface Artist<
  Model = {},
  View extends WorldRenderable = WorldRenderable
> {
  /**
   * Attempt to update the view in-place, given the model
   * used to create the original view, and the old state.
   *
   * @returns {boolean} true if the update was successful, or false if
   * a new view must be created.
   */
  patch(view: View, newModel: NodeValues<Model>): boolean;

  /**
   * Given the sequence, create a projected that is used to
   * render the sequence.
   *
   * @param {projector} the target projector
   * @param {seq} the target projector
   */
  make(projector: Projector, seq: NodeValues<Model>): View;
}
