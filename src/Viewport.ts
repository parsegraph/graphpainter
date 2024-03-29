import log, { logc } from "parsegraph-log";
import Method from "parsegraph-method";

import { PaintedNode } from "parsegraph-artist";
import { makeInverse3x3, matrixTransform2D } from "parsegraph-matrix";
import Camera from "parsegraph-camera";

import { Projector, Projected } from "parsegraph-projector";
import Color from "parsegraph-color";
import { BasicMouseController, MouseInput } from "parsegraph-input";

import GraphPainter from "./GraphPainter";

export default class Viewport
  extends BasicMouseController
  implements Projected
{
  _camera: Camera;
  _needsRender: boolean;
  _needsRepaint: boolean;
  _root: PaintedNode;
  _painter: GraphPainter;
  _inputs: Map<Projector, MouseInput>;
  _onScheduleUpdate: Method;
  _focusedNode: PaintedNode;
  _backgroundColor: Color;

  constructor(
    root: PaintedNode,
    backgroundColor: Color = new Color(0, 0, 0, 1)
  ) {
    super();
    this._root = root;
    this._backgroundColor = backgroundColor;
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
      const input = new MouseInput();
      input.setControl(this);
      input.mount(projector.glProvider().container());
      this._inputs.set(projector, input);
    }
    if (!this._painter.paint(projector, timeout)) {
      this._needsRepaint = false;
    } else {
      this._needsRepaint = true;
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
    return this._needsRepaint;
  }

  needsRender() {
    return this.needsRepaint() || this._needsRender;
  }

  camera() {
    return this._camera;
  }

  backgroundColor(): Color {
    return this._backgroundColor;
  }

  setBackgroundColor(color: Color) {
    this._backgroundColor = color;
    this.scheduleRender();
  }

  private renderBackground(projector: Projector) {
    const hasGL = projector.glProvider()?.hasGL();
    const container = projector.glProvider().container();
    if (container.style.backgroundColor != this.backgroundColor().asRGBA()) {
      container.style.backgroundColor = this.backgroundColor().asRGBA();
    }
    if (hasGL) {
      // console.log("Rendering GL background");
      const gl = projector.glProvider().gl();
      const bg = this.backgroundColor();
      gl.viewport(0, 0, projector.width(), projector.height());
      gl.clearColor(bg.r(), bg.g(), bg.b(), bg.a());
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    if (projector.hasOverlay()) {
      // console.log("Rendering canvas background");
      const overlay = projector.overlay();
      overlay.textBaseline = "top";
      overlay.fillStyle = this.backgroundColor().asRGBA();
      overlay.resetTransform();
      overlay.clearRect(0, 0, projector.width(), projector.height());
    }
    if (projector.hasDOMContainer()) {
      // console.log("Rendering DOM background");
    }
  }

  render(projector: Projector): boolean {
    const hasGL = projector.glProvider()?.hasGL();
    if (hasGL) {
      const gl = projector.glProvider().gl();
      if (gl.isContextLost()) {
        return false;
      }
    }
    const cam = this.camera();
    const width = projector.width();
    const height = projector.height();

    if (!cam.setSize(width, height) && !this.needsRender()) {
      // console.log("Avoided render");
      return false;
    }

    this.renderBackground(projector);
    const needsUpdate = this._painter.render(projector);
    if (needsUpdate) {
      log("World was rendered dirty.");
      this.scheduleRender();
    } else {
      this._needsRender = false;
    }

    return needsUpdate;
  }

  mousemove(x: number, y: number): void {
    super.mousemove(x, y);
    const mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.camera().worldMatrix()),
      x,
      y
    );
    const node: PaintedNode = this.root()
      .value()
      .getLayout()
      .nodeUnderCoords(mouseInWorld[0], mouseInWorld[1]) as PaintedNode;
    if (node === this._focusedNode) {
      return;
    }
    if (this._focusedNode) {
      this._focusedNode.value().interact().blur();
    }
    this._focusedNode = node;
    if (this._focusedNode) {
      this._focusedNode.value().interact().focus();
      this.scheduleRepaint();
    }
    log("" + node);
  }

  unmount(projector: Projector): void {
    if (!this._inputs.has(projector)) {
      return;
    }
    const input = this._inputs.get(projector);
    input.unmount();
    this._inputs.delete(projector);
  }

  dispose() {
    this._inputs.clear();
  }
}
