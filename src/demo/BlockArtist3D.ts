import BlockPainter, { BlockType } from "parsegraph-blockpainter";
import { Projector } from "parsegraph-projector";
import Method from "parsegraph-method";
import Artist, { WorldRenderable } from "../Artist";
import WorldTransform from "../WorldTransform";
import Color from "parsegraph-color";
import log from "parsegraph-log";
import paintNodeLines from "../paintNodeLines";
import NodeValues from "../NodeValues";
import Block from "./Block";

class BlockScene3D implements WorldRenderable {
  _blockPainter: BlockPainter;
  _projector: Projector;
  _world: WorldTransform;
  _onScheduleUpdate: Method;
  _subgroup: NodeValues<Block>;
  _blockCount: number;

  constructor(projector: Projector, subgroup: NodeValues<Block>) {
    this._projector = projector;
    this._blockCount = 0;
    this._subgroup = subgroup;
    this._world = null;
    this._onScheduleUpdate = new Method();
    this._blockPainter = new BlockPainter(
      projector.glProvider(),
      BlockType.ROUNDED
    );
  }

  gl() {
    return this._projector.glProvider().gl();
  }

  subgroup() {
    return this._subgroup;
  }

  setOnScheduleUpdate(listener: () => void, listenerObj?: object) {
    this._onScheduleUpdate.set(listener, listenerObj);
  }

  markDirty() {
    this._blockCount = 0;
    this._onScheduleUpdate.call();
  }

  contextChanged(isLost: boolean): void {
    if (isLost) {
      this.unmount();
    }
  }

  tick(): boolean {
    return false;
  }

  getBlockPainter() {
    return this._blockPainter;
  }

  unmount(): void {
    this.getBlockPainter().clear();
  }

  setWorldTransform(world: WorldTransform) {
    this._world = world;
  }

  blockCount() {
    return this._blockCount;
  }

  countBlock(val: number = 1): void {
    this._blockCount += val;
  }

  hasCount() {
    return this._blockCount > 0;
  }

  setSeq(seq: NodeValues<Block>) {
    this._blockCount = 0;
    this._subgroup = seq;
  }

  paint(): boolean {
    if (!this.hasCount()) {
      this._subgroup.forEach((val) => {
        this.countBlock();
        paintNodeLines(val.node(), 1, () => {
          this.countBlock();
        });
      });
      this._blockPainter.initBuffer(this.blockCount());
    }

    this._subgroup.forEach((val: Block) => {
      const layout = val.getLayout();
      log("Painting BLOCK at ({0}, {1})", layout.groupX(), layout.groupY());
      const painter = this.getBlockPainter();
      paintNodeLines(
        val.node(),
        val.borderThickness(),
        (x: number, y: number, w: number, h: number) => {
          painter.setBackgroundColor(val.lineColor());
          painter.setBorderColor(val.lineColor());
          painter.drawBlock(x, y, w, h, 0, 0);
        }
      );
      painter.setBorderColor(
        val.focused()
          ? new Color(1, 1, 1, 1)
          : val.borderColor().premultiply(val.color())
      );
      painter.setBackgroundColor(val.color());
      painter.drawBlock(
        layout.groupX(),
        layout.groupY(),
        layout.size().width(),
        layout.size().height(),
        2.5 * val.borderRoundness(),
        2 * val.borderThickness()
      );
    });
    return false;
  }

  render(): boolean {
    const painter = this.getBlockPainter();
    const gl = this.gl();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    painter.render(this._world.matrix(), this._world.scale());
    return false;
  }
}

export default class BlockArtist3D implements Artist<Block> {
  make(projector: Projector, seq: NodeValues<Block>) {
    return new BlockScene3D(projector, seq);
  }

  patch(view: BlockScene3D, seq: NodeValues<Block>): boolean {
    view.setSeq(seq);
    return true;
  }

  static _instance: BlockArtist3D;
  static instance() {
    if (!BlockArtist3D._instance) {
      BlockArtist3D._instance = new BlockArtist3D();
    }
    return BlockArtist3D._instance;
  }
}
