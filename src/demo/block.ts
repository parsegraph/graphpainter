import { Interactive, Interaction } from "parsegraph-interact";
import log, { logc } from "parsegraph-log";
import Rect from "parsegraph-rect";
import Color from "parsegraph-color";
import Freezer from "../freezer/Freezer";
import Method from "parsegraph-method";

import Painted from "../Painted";
import WindowNode from "../WindowNode";
import { Layout, LayoutNode } from "parsegraph-layout";
import FreezerCache from "../freezer/FreezerCache";
import Freezable from "../freezer/Freezable";
import Artist, { Counts } from "../Artist";
import PaintContext from "../PaintContext";
import {
  makeInverse3x3,
  Matrix3x3,
  matrixTransform2D,
} from "parsegraph-matrix";
import Camera from "parsegraph-camera";
import Size from "parsegraph-size";

import GraphPainter from "../graphpainter/GraphPainter";

import BlockPainter, { BlockType } from "parsegraph-blockpainter";
import TimingBelt from "parsegraph-timingbelt";
import {
  Projector,
  Projected,
  Projection,
  BasicProjector,
} from "parsegraph-projector";
import Input from "parsegraph-input";
import Direction, {
  isVerticalDirection,
  directionSign,
  forEachCardinalDirection,
  DirectionNode,
} from "parsegraph-direction";
import { showInCamera } from "parsegraph-showincamera";

export const LINE_COLOR = new Color(0.8, 0.8, 0.8, 0.6);
export const SELECTED_LINE_COLOR = new Color(0.8, 0.8, 0.8, 1);
export const BUD_RADIUS = 2;

export const LINE_THICKNESS = (12 * BUD_RADIUS) / 8;

class BlockArtist implements Artist {
  contextChanged(ctx: PaintContext, isLost: boolean): void {
    const painter = BlockArtist.getBlockPainter(ctx);
    painter.contextChanged(isLost);
  }

  tick(): boolean {
    return false;
  }

  unmount(ctx: PaintContext): void {
    const painter = BlockArtist.getBlockPainter(ctx);
    painter.clear();
  }

  setup(ctx: PaintContext, counts: Counts) {
    const painter = new BlockPainter(
      ctx.projector().glProvider(),
      BlockType.ROUNDED
    );
    painter.initBuffer(counts.blocks || 0);
    ctx.set("blockpainter", painter);
  }

  bounds(ctx: PaintContext): Rect {
    const painter = BlockArtist.getBlockPainter(ctx);
    return painter.bounds();
  }

  render(
    world: Matrix3x3,
    scale: number,
    forceSimple: boolean,
    _: Camera,
    ctx: PaintContext
  ): void {
    const painter = BlockArtist.getBlockPainter(ctx);
    const gl = ctx.projector().glProvider().gl();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    painter.render(world, scale, forceSimple);
  }

  static countBlock(counts: { [key: string]: number }, val: number = 1): void {
    counts.blocks = counts.blocks || 0;
    counts.blocks += val;
  }

  static getBlockPainter(ctx: PaintContext): BlockPainter {
    return ctx.get("blockpainter");
  }

  static _instance: BlockArtist = null;
  static instance() {
    if (!BlockArtist._instance) {
      BlockArtist._instance = new BlockArtist();
    }
    return BlockArtist._instance;
  }
}

class NodeLinePainter {
  _color: Color;

  constructor(color: Color) {
    this._color = color;
  }

  backgroundColor() {
    return this._color;
  }

  paintLines(painter: BlockPainter, node: LayoutNode) {
    forEachCardinalDirection((dir: Direction) => {
      this.drawLine(painter, dir, node);
    });
  }

  countLines(node: LayoutNode): number {
    let lines = 0;
    forEachCardinalDirection((dir: Direction) => {
      if (node.parentDirection() == dir) {
        return;
      }
      if (!node.hasChild(dir)) {
        return;
      }
      ++lines;
    });
    return lines;
  }

  drawLine(painter: BlockPainter, direction: Direction, node: LayoutNode) {
    if (node.parentDirection() == direction) {
      return;
    }
    if (!node.hasChild(direction)) {
      // Do not draw lines unless there is a node.
      return;
    }
    const directionData = node.neighborAt(direction);

    const color = LINE_COLOR; //.premultiply(this.backgroundColor());
    painter.setBorderColor(color);
    painter.setBackgroundColor(color);

    const layout = node.value().getLayout();
    const parentScale = layout.groupScale();
    const scale = directionData.getNode().value().getLayout().groupScale();
    if (typeof scale !== "number" || isNaN(scale)) {
      console.log(directionData.node);
      throw new Error(
        directionData.node + "'s groupScale must be a number but was " + scale
      );
    }

    const thickness = LINE_THICKNESS * scale * directionData.getNode().scale();
    // console.log(thickness, scale);
    if (isVerticalDirection(direction)) {
      const length =
        directionSign(direction) *
        parentScale *
        (directionData.lineLength - node.value().size().height() / 2);
      painter.drawBlock(
        layout.groupX(),
        layout.groupY() +
          length / 2 +
          (parentScale *
            directionSign(direction) *
            node.value().size().height()) /
            2,
        thickness,
        Math.abs(length),
        0,
        0
      );
    } else {
      // Horizontal line.
      const length =
        directionSign(direction) *
        parentScale *
        (directionData.lineLength - node.value().size().width() / 2);
      painter.drawBlock(
        layout.groupX() +
          length / 2 +
          (parentScale *
            directionSign(direction) *
            node.value().size().width()) /
            2,
        layout.groupY(),
        Math.abs(length),
        thickness,
        0,
        0
      );
    }
  }
}

export default class Block implements Interactive, Painted, Freezable {
  _layout: Layout;
  _interactor: Interaction;
  _node: WindowNode;
  _cache: FreezerCache;
  _color: Color;
  _borderColor: Color;
  _lines: NodeLinePainter;
  _focused: boolean;

  constructor(node: WindowNode, color: Color, borderColor: Color) {
    this._node = node;
    this._focused = false;
    this._interactor = new Interaction();
    this._interactor.setFocusListener(this.onFocus, this);
    this._layout = new Layout(node);
    this._cache = new FreezerCache(node);
    this._color = color;
    this._borderColor = borderColor;
    this._lines = new NodeLinePainter(this._color);
    this._node.setDirtyListener(this.onDirty, this);
  }

  onDirty() {
    log("Node is dirty");
    if (this.getCache().isFrozen()) {
      this.getCache().frozenNode().invalidate();
    }
  }

  onFocus(focus: boolean): boolean {
    this._focused = focus;
    this._node.layoutWasChanged();
    return true;
  }

  draft(counts: Counts): void {
    BlockArtist.countBlock(counts);
    BlockArtist.countBlock(counts, this._lines.countLines(this._node));
  }

  getSeparation() {
    return 10;
  }

  size(size?: Size): Size {
    if (!size) {
      size = new Size();
    }
    size.setWidth(100);
    size.setHeight(100);
    return size;
  }

  paint(ctx: PaintContext): boolean {
    const layout = this.getLayout();
    log("Painting BLOCK at ({0}, {1})", layout.groupX(), layout.groupY());
    const painter = BlockArtist.getBlockPainter(ctx);
    this._lines.paintLines(painter, this._node);
    painter.setBorderColor(
      this._focused ? new Color(1, 1, 1, 1) : this._borderColor
    );
    painter.setBackgroundColor(this._color);
    painter.drawBlock(
      layout.groupX(),
      layout.groupY(),
      this.size().width(),
      this.size().height(),
      25,
      10
    );
    return false;
  }

  getArtist(): Artist {
    return BlockArtist.instance();
  }

  node(): WindowNode {
    return this._node;
  }

  getCache() {
    return this._cache;
  }

  getLayout(): Layout {
    return this._layout;
  }

  interact(): Interaction {
    return this._interactor;
  }
}

class BlockComp implements Projected {
  _camera: Camera;
  _needsRender: boolean;
  _needsRepaint: boolean;
  _root: WindowNode;
  _painter: GraphPainter;
  _inputs: Map<Projector, Input>;
  _onScheduleUpdate: Method;

  constructor(root: WindowNode) {
    this._root = root;
    this._camera = new Camera();
    this._needsRepaint = true;
    this._needsRender = true;
    this._painter = new GraphPainter(root, this._camera);
    this._inputs = new Map();

    this._onScheduleUpdate = new Method();
  }

  scheduleUpdate() {
    this._onScheduleUpdate.call();
  }

  setOnScheduleUpdate(func: Function, funcObj?: any) {
    this._onScheduleUpdate.set(func, funcObj);
  }

  root() {
    return this._root;
  }

  tick(_: number): boolean {
    return false;
  }

  /**
   * Paints the scene's assets.
   * @param timeout
   */
  paint(projector: Projector, timeout?: number): boolean {
    if (!this._inputs.has(projector)) {
      projector.getDOMContainer().style.pointerEvents = "auto";
      this._inputs.set(
        projector,
        new Input(
          projector.glProvider().canvas(),
          projector.getDOMContainer(),
          (eventType: string, inputData?: any) => {
            if (this.handleEvent(eventType, inputData)) {
              this.scheduleRepaint();
              return true;
            }
            return false;
          }
        )
      );
    }
    const gl = projector.glProvider().gl();
    if (gl.isContextLost()) {
      return false;
    }
    if (!this.needsRepaint()) {
      // console.log("No need to paint; viewport is not dirty for window " + window.id());
      return false;
    }

    if (!this._painter.paint(projector, timeout)) {
      this._needsRepaint = false;
    }
  }

  scheduleRepaint() {
    // console.log("Viewport is scheduling repaint");
    this.scheduleUpdate();
    this._needsRepaint = true;
    this._needsRender = true;
  }

  scheduleRender() {
    // console.log("Viewport is scheduling render");
    this.scheduleUpdate();
    this._needsRender = true;
  }

  needsRepaint() {
    return this._needsRepaint || this._root.isDirty();
  }

  needsRender() {
    return this.needsRepaint() || this._needsRender;
  }

  camera() {
    return this._camera;
  }

  /**
   * Renders the scene's assets.
   * @param width
   * @param height
   * @param avoidIfPossible
   */
  render(projector: Projector): boolean {
    const gl = projector.glProvider().gl();
    if (gl.isContextLost()) {
      return false;
    }
    const cam = this.camera();

    const width = document.body.clientWidth;//projector.glProvider().canvas().width;
    const height = document.body.clientHeight;//projector.glProvider().canvas().height;
    gl.viewport(
      0,
      0,
      width,
      height
    );
    if (!cam.setSize(width, height) && !this.needsRender()) {
      // console.log("Avoided render");
      return false;
    }

    showInCamera(this.root(), cam, true);

    gl.clear(gl.COLOR_BUFFER_BIT);
    const overlay = projector.overlay();
    overlay.textBaseline = "top";

    let needsUpdate = this._painter.render(projector);
    if (needsUpdate) {
      log("World was rendered dirty.");
      this.scheduleRender();
    } else {
      this._needsRender = false;
    }

    return needsUpdate;
  }

  contextChanged(projector: Projector, isLost: boolean): void {
    this._painter.contextChanged(projector, isLost);
  }

  _focusedNode: WindowNode;

  handleEvent(eventType: string, event?: any): boolean {
    logc("Input events", eventType, event);
    switch (eventType) {
      case "mousemove":
        const mouseInWorld = matrixTransform2D(
          makeInverse3x3(this.camera().worldMatrix()),
          event.x,
          event.y
        );
        const node: WindowNode = this.root()
          .value()
          .getLayout()
          .nodeUnderCoords(mouseInWorld[0], mouseInWorld[1]) as WindowNode;
        if (node === this._focusedNode) {
          return true;
        }
        if (this._focusedNode) {
          this._focusedNode.value().interact().blur();
        }
        this._focusedNode = node;
        if (this._focusedNode) {
          this._focusedNode.value().interact().focus();
        }
        log("" + node);
        return true;
    }
    return false;
  }

  /**
   * Dismount the given window, removing component-specific event
   * listeners and DOM assets.
   * @param window the window to unmount this component.
   */
  unmount(projector: Projector): void {
    if (!this._inputs.has(projector)) {
      return;
    }
    //const input = this._inputs.get(projector);
    //input.unmount();
    this._inputs.delete(projector);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const belt = new TimingBelt();

  const root: WindowNode = new DirectionNode();
  root.setValue(new Block(root, new Color(1, 1, 1), new Color(0.5)));
  const freezer = new Freezer();
  //root.value().getCache().freeze(freezer);

  let n = root;
  for (let i = 0; i < 10; ++i) {
    const child: WindowNode = new DirectionNode();
    child.setValue(
      new Block(child, new Color(1 - i / 10, 0, 0), new Color(0.5))
    );
    n.connectNode(
      Math.random() > 0.5 ? Direction.FORWARD : Direction.DOWNWARD,
      child
    );
    n = child;
  }

  const comp = new BlockComp(root);
  const projector = new BasicProjector();
  belt.addRenderable(new Projection(projector, comp));

  new ResizeObserver(() => {
    belt.scheduleUpdate();
  }).observe(projector.container());

  document.getElementById("demo").appendChild(projector.container());
});
