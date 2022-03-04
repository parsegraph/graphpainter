import { Projector } from "parsegraph-projector";
import Method from "parsegraph-method";
import Artist, {
  NodeValues,
  WorldTransform,
  WorldRenderable,
  paintNodeLines
} from "parsegraph-artist";
import Block from "./Block";

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
  }

  render() {
    this.blocks().forEach((block: Block) => this.renderBlock(block));
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
