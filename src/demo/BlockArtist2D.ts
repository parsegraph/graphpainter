import { Projector } from "parsegraph-projector";
import Method from "parsegraph-method";
import NodeValues from "../NodeValues";
import Artist, { WorldRenderable } from "../Artist";
import WorldTransform from "../WorldTransform";
import Block from "./Block";
import paintNodeLines from "../paintNodeLines";

class BlockScene2D implements WorldRenderable {
  _projector: Projector;
  _seq: NodeValues<Block>;
  _onUpdate: Method;
  _world: WorldTransform;

  constructor(projector: Projector, seq: NodeValues<Block>) {
    this._seq = seq;
    this._onUpdate = new Method();
    this._projector = projector;
  }

  setSeq(seq: NodeValues<Block>) {
    this._seq = seq;
  }

  projector() {
    return this._projector;
  }

  subgroup() {
    return this._seq;
  }

  markDirty() {
    this._onUpdate.call();
  }

  setOnScheduleUpdate(listener: () => void, listenerObj?: object): void {
    this._onUpdate.set(listener, listenerObj);
  }

  tick() {
    return false;
  }

  paint() {
    // Prime the overlay for rendering.
    this.projector().overlay();
    return false;
  }

  setWorldTransform(world: WorldTransform) {
    this._world = world;
  }

  strokeRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  render() {
    this.subgroup().forEach((val) => {
      const layout = val.getLayout();
      const ctx = this.projector().overlay();
      const color = val.color();
      const size = val.size();
      const borderRoundness = val.borderRoundness();
      const borderThickness = val.borderThickness();

      ctx.scale(layout.groupScale(), layout.groupScale());

      paintNodeLines(
        val.node(),
        val.borderThickness(),
        (x: number, y: number, w: number, h: number) => {
          ctx.strokeStyle = val.borderColor().asRGBA();
          ctx.fillStyle = val.borderColor().asRGBA();
          ctx.fillRect(x - w / 2, y - h / 2, w, h);
        }
      );

      ctx.fillStyle = color.asRGB();
      this.strokeRoundedRect(
        ctx,
        layout.groupX() + borderThickness / 2 - size.width() / 2,
        layout.groupY() + borderThickness / 2 - size.height() / 2,
        size.width() - borderThickness,
        size.height() - borderThickness,
        borderRoundness * layout.groupScale()
      );
      ctx.fill();
      ctx.strokeStyle = val.focused()
        ? "#fff"
        : val.borderColor().premultiply(color).asRGBA();
      ctx.lineWidth = borderThickness * layout.groupScale();
      this.strokeRoundedRect(
        ctx,
        layout.groupX() + borderThickness / 2 - size.width() / 2,
        layout.groupY() + borderThickness / 2 - size.height() / 2,
        size.width() - borderThickness,
        size.height() - borderThickness,
        borderRoundness * layout.groupScale()
      );
      ctx.stroke();
    });
    return false;
  }

  unmount() {}
}

export default class BlockArtist2D implements Artist<Block> {
  make(projector: Projector, seq: NodeValues<Block>) {
    return new BlockScene2D(projector, seq);
  }

  patch(view: BlockScene2D, seq: NodeValues<Block>): boolean {
    view.setSeq(seq);
    return true;
  }

  static _instance: BlockArtist2D;
  static instance() {
    if (!BlockArtist2D._instance) {
      BlockArtist2D._instance = new BlockArtist2D();
    }
    return BlockArtist2D._instance;
  }
}
