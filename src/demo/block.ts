import { Interactive, Interaction } from "parsegraph-interact";
import log, { logc } from "parsegraph-log";
import Rect from "parsegraph-rect";
import Color from "parsegraph-color";
import Freezer from "../freezer/Freezer";
import Method from "parsegraph-method";

import Painted from "../Painted";
import ProjectedNode from "../ProjectedNode";
import { Layout, LayoutNode } from "parsegraph-layout";
import FreezerCache from "../freezer/FreezerCache";
import Freezable from "../freezer/Freezable";
import Artist from "../Artist";
import {
  makeInverse3x3,
  Matrix3x3,
  matrixIdentity3x3,
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
import PaintSubgroup from "../graphpainter/PaintSubgroup";
import WorldTransform from "../WorldTransform";

export const LINE_COLOR = new Color(0.8, 0.8, 0.8, 0.6);
export const SELECTED_LINE_COLOR = new Color(0.8, 0.8, 0.8, 1);
export const BUD_RADIUS = 2;

export const LINE_THICKNESS = (12 * BUD_RADIUS) / 8;

class BlockSceneData {
  _currentNode: () => ProjectedNode<BlockScene>;
  _blockPainter: BlockPainter;
  _projector: Projector;
  _scene: BlockScene;

  constructor(projector: Projector, scene: BlockScene) {
    this._currentNode = null;
    this._scene = scene;

    this._projector = projector;
    this._blockPainter = new BlockPainter(
      projector.glProvider(),
      BlockType.ROUNDED
    );
  }

  blockPainter() {
    return this._blockPainter;
  }

  markDirty() {
    this._currentNode = null;
  }

  draft(count: number) {
    this._blockPainter.initBuffer(count);
  }

  scene() {
    return this._scene;
  }

  subgroup() {
    return this.scene().subgroup();
  }

  paint() {
    if (!this._currentNode) {
      this._currentNode = this.subgroup().iterate();
    }
    let n: ProjectedNode;
    while ((n = this._currentNode())) {
      if (n.value().draw(this._projector, this._scene)) {
        return;
      }
    }
    this._currentNode = null;
    return false;
  }
}

class BlockScene implements Projected {
  _data: Map<Projector, BlockSceneData>;
  _world: Matrix3x3;
  _scale: number;
  _onScheduleUpdate: Method;
  _subgroup: PaintSubgroup<BlockScene>;
  _blockCount: number;

  constructor(subgroup: PaintSubgroup<BlockScene>) {
    this._blockCount = 0;
    this._data = new Map();
    this._subgroup = subgroup;
    this._world = matrixIdentity3x3();
    this._scale = 1;
    this._onScheduleUpdate = new Method();
  }

  subgroup() {
    return this._subgroup;
  }

  setOnScheduleUpdate(listener: () => void, listenerObj?: object) {
    this._onScheduleUpdate.set(listener, listenerObj);
  }

  markDirty(projector: Projector) {
    const data = this._data.get(projector);
    if (data) {
      data.markDirty();
    }
    this._blockCount = 0;
    this._onScheduleUpdate.call();
  }

  contextChanged(projector: Projector, isLost: boolean): void {
    if (isLost) {
      this.unmount(projector);
    }
  }

  tick(): boolean {
    return false;
  }

  hasBlockPainter(projector: Projector) {
    return this._data.has(projector);
  }

  getBlockPainter(projector: Projector) {
    return this._data.get(projector)?.blockPainter();
  }

  unmount(projector: Projector): void {
    if (!this.hasBlockPainter(projector)) {
      return;
    }
    const painter = this.getBlockPainter(projector);
    if (painter) {
      painter.clear();
    }
  }

  setWorldTransform(world: Matrix3x3, scale: number) {
    this._world = world;
    this._scale = scale;
  }

  countBlock(val: number = 1): void {
    this._blockCount += val;
  }

  hasCount() {
    return this._blockCount > 0;
  }

  paint(projector: Projector): boolean {
    if (!this.hasCount()) {
      this._subgroup.forEachNode((n) => {
        n.value().draft(this);
      });
    }

    if (!this.hasBlockPainter(projector)) {
      this._data.set(projector, new BlockSceneData(projector, this));
    }

    const data = this._data.get(projector);
    data.draft(this.blockCount());
    return data.paint();
  }

  blockCount() {
    return this._blockCount;
  }

  render(projector: Projector): boolean {
    const painter = this.getBlockPainter(projector);
    if (!painter) {
      return true;
    }
    const gl = projector.glProvider().gl();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    painter.render(this._world, this._scale);
    return false;
  }
}

class BlockArtist implements Artist<BlockScene> {
  make(subgroup: PaintSubgroup<BlockScene>) {
    return new BlockScene(subgroup);
  }

  bounds(projector: Projector, scene: BlockScene) {
    return scene.getBlockPainter(projector)?.bounds();
  }

  setWorldTransform(scene: BlockScene, world: WorldTransform) {
    scene.setWorldTransform(world.matrix(), world.scale());
  }

  static _instance: BlockArtist;
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

    const color = LINE_COLOR; // .premultiply(this.backgroundColor());
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

export default class Block
  implements Interactive, Painted<BlockScene>, Freezable {
  _layout: Layout;
  _interactor: Interaction;
  _node: ProjectedNode;
  _cache: FreezerCache;
  _color: Color;
  _borderColor: Color;
  _lines: NodeLinePainter;
  _focused: boolean;

  constructor(node: ProjectedNode, color: Color, borderColor: Color) {
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

  draft(scene: BlockScene): void {
    scene.countBlock();
    scene.countBlock(this._lines.countLines(this._node));
  }

  draw(projector: Projector, scene: BlockScene): boolean {
    const layout = this.getLayout();
    log("Painting BLOCK at ({0}, {1})", layout.groupX(), layout.groupY());
    const painter = scene.getBlockPainter(projector);
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

  artist(): Artist<BlockScene> {
    return BlockArtist.instance();
  }

  node(): ProjectedNode {
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
  _root: ProjectedNode;
  _painter: GraphPainter;
  _inputs: Map<Projector, Input>;
  _onScheduleUpdate: Method;

  constructor(root: ProjectedNode) {
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

  tick(): boolean {
    return false;
  }

  paint(projector: Projector, timeout?: number): boolean {
    if (!this._inputs.has(projector)) {
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

    return this._needsRepaint;
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

  render(projector: Projector, width: number, height: number): boolean {
    const gl = projector.glProvider().gl();
    if (gl.isContextLost()) {
      return false;
    }
    const cam = this.camera();

    if (!cam.setSize(width, height) && !this.needsRender()) {
      // console.log("Avoided render");
      return false;
    }

    showInCamera(this.root(), cam, true);

    gl.clear(gl.COLOR_BUFFER_BIT);
    const overlay = projector.overlay();
    overlay.textBaseline = "top";

    const needsUpdate = this._painter.render(projector);
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

  _focusedNode: ProjectedNode;

  handleEvent(eventType: string, event?: any): boolean {
    logc("Input events", eventType, event);
    switch (eventType) {
      case "mousemove":
        const mouseInWorld = matrixTransform2D(
          makeInverse3x3(this.camera().worldMatrix()),
          event.x,
          event.y
        );
        const node: ProjectedNode = this.root()
          .value()
          .getLayout()
          .nodeUnderCoords(mouseInWorld[0], mouseInWorld[1]) as ProjectedNode;
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

  unmount(projector: Projector): void {
    if (!this._inputs.has(projector)) {
      return;
    }
    // const input = this._inputs.get(projector);
    // input.unmount();
    this._inputs.delete(projector);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const belt = new TimingBelt();

  const root: ProjectedNode = new DirectionNode();
  root.setValue(new Block(root, new Color(1, 1, 1), new Color(0.5)));
  // const freezer = new Freezer();
  // root.value().getCache().freeze(freezer);

  let n = root;
  for (let i = 0; i < 10; ++i) {
    const child: ProjectedNode = new DirectionNode();
    child.setValue(
      new Block(child, new Color(1 - i / 10, 0, 0), new Color(0.5))
    );
    n.connectNode(
      Math.random() > 0.5 ? Direction.FORWARD : Direction.DOWNWARD,
      child
    );
    n = child;
  }

  const projector = new BasicProjector();

  new ResizeObserver(() => {
    belt.scheduleUpdate();
  }).observe(projector.container());

  document.getElementById("demo").appendChild(projector.container());

  const comp = new BlockComp(root);
  const proj = new Projection(projector, comp);
  proj.setClip(new Rect(0, 0, projector.width(), projector.height()));
  belt.addRenderable(proj);
});
