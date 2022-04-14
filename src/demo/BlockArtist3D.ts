import BlockPainter, { BlockType } from "parsegraph-blockpainter";
import { Projector } from "parsegraph-projector";
import Method from "parsegraph-method";
import {
  WorldTransform,
  WorldRenderable,
} from 'parsegraph-scene';
import Artist, {
  NodeValues,
  paintNodeLines,
} from "parsegraph-artist";
import Color from "parsegraph-color";
import log from "parsegraph-log";
import Block from "parsegraph-block";

class BlockScene3D implements WorldRenderable {
  _blockPainter: BlockPainter;
  _projector: Projector;
  _world: WorldTransform;
  _onScheduleUpdate: Method;
  _blocks: NodeValues<Block>;
  _blockCount: number;

  constructor(projector: Projector, blocks: NodeValues<Block>) {
    this._projector = projector;
    this._blockCount = 0;
    this._blocks = blocks;
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

  blocks() {
    return this._blocks;
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

  setBlocks(blocks: NodeValues<Block>) {
    this._blockCount = 0;
    this._blocks = blocks;
  }

  paint(): boolean {
    if (!this.hasCount()) {
      this._blocks.forEach((n) => {
        this.countBlock();
        paintNodeLines(n, 1, () => {
          this.countBlock();
        });
      });
      this._blockPainter.initBuffer(this.blockCount());
    }

    this._blocks.forEach((n) => {
      const block = n.value();
      const layout = block.getLayout();
      log("Painting BLOCK at ({0}, {1})", layout.groupX(), layout.groupY());
      const painter = this.getBlockPainter();
      paintNodeLines(
        block.node(),
        block.borderThickness(),
        (x: number, y: number, w: number, h: number) => {
          painter.setBackgroundColor(block.lineColor());
          painter.setBorderColor(block.lineColor());
          painter.drawBlock(x, y, w, h, 0, 0);
        }
      );
      painter.setBorderColor(
        block.focused()
          ? new Color(1, 1, 1, 1)
          : block
              .blockStyle()
              .borderColor.premultiply(block.blockStyle().backgroundColor)
      );
      painter.setBackgroundColor(block.blockStyle().backgroundColor);
      painter.drawBlock(
        layout.groupX(),
        layout.groupY(),
        layout.size().width(),
        layout.size().height(),
        2.5 * block.blockStyle().borderRoundness,
        2 * block.blockStyle().borderThickness
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
  make(projector: Projector, blocks: NodeValues<Block>) {
    return new BlockScene3D(projector, blocks);
  }

  patch(view: BlockScene3D, blocks: NodeValues<Block>): boolean {
    view.setBlocks(blocks);
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
