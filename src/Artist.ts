import { Projector, Projected } from "parsegraph-projector";
import PaintSubgroup from "./graphpainter/PaintSubgroup";
import Rect from "parsegraph-rect";
import WorldTransform from "./WorldTransform";

export default interface Artist<T extends Projected> {
  bounds(projector: Projector, projected: T): Rect;

  /**
   * Given the subgroup, create a projected that is used to
   * render the subgroup.
   *
   * @param {projector} the target projector
   */
  make(subgroup: PaintSubgroup): T;

  setWorldTransform(projected: T, worldMat: WorldTransform): void;
}
