import { Positioned } from "parsegraph-layout";
import Artist from "./Artist";
import { Projector, Projected } from "parsegraph-projector";

export default interface Painted<T extends Projected> extends Positioned {
  draft(projected: T): void;

  draw(projector: Projector, projected: T): boolean;

  /**
   * Returns the artist used to paint this object.
   */
  artist(): Artist<T>;
}
