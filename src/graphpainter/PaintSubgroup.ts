import PaintContext from "../PaintContext";
import WindowNode from "../WindowNode";
import Artist, { Counts } from "../Artist";
import { Matrix3x3 } from "parsegraph-matrix";
import Camera from "parsegraph-camera";
import log from "parsegraph-log";
import Rect from "parsegraph-rect";
import { Projector } from "parsegraph-projector";

export default class PaintSubgroup {
  _root: WindowNode;
  _length: number;
  _context: PaintContext;

  constructor(projector: Projector, artist: Artist, root: WindowNode) {
    this._root = root;
    this._context = new PaintContext(projector, artist);
    this._length = 1;
  }

  tick(elapsed: number): boolean {
    return this._context.artist().tick(this._context, elapsed);
  }

  contextChanged(isLost: boolean): void {
    this._context.contextChanged(isLost);
  }

  unmount(): void {
    this._context.unmount();
  }

  root() {
    return this._root;
  }

  paint(): boolean {
    let needsRepaint = false;
    const counts: Counts = {};
    this.forEachNode((node: WindowNode) => {
      node.value().draft(counts);
    });
    this._context.artist().setup(this._context, counts);

    this.forEachNode((node: WindowNode, ctx: PaintContext) => {
      /*
      if (paintGroup.isDirty() || !painter) {
        if (!painter) {
          painter = paintGroup.newPainter(window, paintContext);
          paintGroup.setPainter(window, painter);
        }
      }*/
      log("Painting " + node);
      needsRepaint = node.value().paint(ctx) || needsRepaint;
    });
    return needsRepaint;
  }

  render(
    world: Matrix3x3,
    scale: number,
    forceSimple: boolean,
    camera: Camera
  ): void {
    this.artist().render(world, scale, forceSimple, camera, this.context());
  }

  addNode() {
    ++this._length;
  }

  forEachNode(cb: (node: WindowNode, ctx: PaintContext) => void) {
    let n = this._root;
    for (let i = 0; i < this._length; ++i) {
      cb(n, this.context());
      n = n.nextLayout();
    }
  }

  artist(): Artist {
    return this._context.artist();
  }

  bounds(): Rect {
    return this.artist().bounds(this.context());
  }

  context() {
    return this._context;
  }
}
