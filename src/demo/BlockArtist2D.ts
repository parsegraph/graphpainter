import { Projector } from "parsegraph-projector";
import Method from "parsegraph-method";
import Artist, { NodeValues, paintNodeLines } from "parsegraph-artist";
import Block from "parsegraph-block";
import { WorldTransform, WorldRenderable } from "parsegraph-scene";

class BlockScene2D implements WorldRenderable {
  _projector: Projector;
  _blocks: NodeValues<Block>;
  _onUpdate: Method;
  _world: WorldTransform;

  constructor(projector: Projector, blocks: NodeValues<Block>) {
    this._blocks = blocks;
    this._onUpdate = new Method();
    this._projector = projector;
  }

  setBlocks(blocks: NodeValues<Block>) {
    this._blocks = blocks;
  }

  projector() {
    return this._projector;
  }

  blocks() {
    return this._blocks;
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

  protected renderBlock(val: Block) {
    const layout = val.getLayout();
    const scale = layout.groupScale();
    const ctx = this.projector().overlay();
    const color = val.blockStyle().backgroundColor;
    const size = val.size();
    const borderRoundness = val.blockStyle().borderRoundness;
    const borderThickness = val.blockStyle().borderThickness;

    paintNodeLines(
      val.node(),
      scale * val.borderThickness(),
      (x: number, y: number, w: number, h: number) => {
        ctx.strokeStyle = val.blockStyle().borderColor.asRGBA();
        ctx.fillStyle = val.blockStyle().borderColor.asRGBA();
        ctx.fillRect(
          x - (scale * w) / 2,
          y - (scale * h) / 2,
          scale * w,
          scale * h
        );
      }
    );

    ctx.fillStyle = color.asRGB();
    this.strokeRoundedRect(
      ctx,
      layout.groupX() + borderThickness / 2 - size.width() / 2,
      layout.groupY() + borderThickness / 2 - size.height() / 2,
      scale * (size.width() - borderThickness),
      scale * (size.height() - borderThickness),
      borderRoundness * scale
    );
    ctx.fill();
    ctx.strokeStyle = val.focused()
      ? "#fff"
      : val.blockStyle().borderColor.premultiply(color).asRGBA();
    ctx.lineWidth = borderThickness * scale;
    this.strokeRoundedRect(
      ctx,
      layout.groupX() + borderThickness / 2 - size.width() / 2,
      layout.groupY() + borderThickness / 2 - size.height() / 2,
      scale * (size.width() - borderThickness),
      scale * (size.height() - borderThickness),
      borderRoundness * scale
    );
    ctx.stroke();
  }

  render() {
    this.blocks().forEach((n) => {
      this.renderBlock(n.value());
      this._world
        .labels()
        ?.draw(
          "BLOCK",
          n.value().getLayout().absoluteX(),
          n.value().getLayout().absoluteY(),
          12,
          2.0 / n.value().getLayout().absoluteScale()
        );
    });
    return false;
  }

  unmount() {}
}

export default class BlockArtist2D implements Artist<Block> {
  make(projector: Projector, blocks: NodeValues<Block>) {
    return new BlockScene2D(projector, blocks);
  }

  patch(view: BlockScene2D, blocks: NodeValues<Block>): boolean {
    view.setBlocks(blocks);
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
