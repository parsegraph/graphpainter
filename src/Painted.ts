import { Positioned } from "parsegraph-layout";
import Artist, { Counts } from "./Artist";
import PaintContext from "./PaintContext";

export default interface Painted extends Positioned {
  /**
   * Increment the counters for the painters used
   * to draw this painted.
   *
   * During graph painting, this is called for each node in a
   * paint group. It is then passed to the artist's setup method.
   */
  draft(counts: Counts): void;

  /**
   * Paint this object using the given context.
   *
   * During graph painting, this is called for each node in a
   * paint group, after the draft method, and after the artist's
   * setup. The context has been setup by the artist.
   */
  paint(ctx: PaintContext): boolean;

  /**
   * Returns the artist used to paint this object.
   */
  getArtist(): Artist;
}
