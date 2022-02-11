import { Positioned } from "parsegraph-layout";
import Artist, { WorldRenderable } from "./Artist";

export default interface Painted<
  Model = {},
  View extends WorldRenderable = WorldRenderable
> extends Positioned {
  /**
   * Returns the artist used to paint this object.
   */
  artist(): Artist<Model, View>;
}
