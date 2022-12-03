import Camera from "parsegraph-camera";
import log from "parsegraph-log";
import { Projector } from "parsegraph-projector";
import { Projected } from "parsegraph-projector";
import Method from "parsegraph-method";
import { WorldLabels } from 'parsegraph-scene';

import {
  makeScale3x3I,
  makeTranslation3x3I,
  matrixMultiply3x3I,
  Matrix3x3,
  matrixIdentity3x3,
} from "parsegraph-matrix";
import Rect from "parsegraph-rect";
import NodeRenderData from "../NodeRenderData";
import { Renderable } from "parsegraph-timingbelt";
import { PaintedNode, Pizza } from "parsegraph-artist";
import { WorldTransform } from "parsegraph-scene";

let CACHED_RENDERS: number = 0;
let IMMEDIATE_RENDERS: number = 0;

const renderData: NodeRenderData = new NodeRenderData();

export default class PaintGroup implements Projected {
  _root: PaintedNode;
  _projections: Map<Projector, Pizza>;
  _onScheduleUpdate: Method;
  _camera: Camera;
  _labels: WorldLabels;

  constructor(root: PaintedNode) {
    this._root = root;
    this._projections = new Map();
    this._onScheduleUpdate = new Method();
    this._labels = null;
  }

  allViews(cb: (slice: Renderable) => void): void {
    this._projections.forEach((pizza) => {
      pizza.eachView(cb);
    });
  }

  tick(cycleStart: number): boolean {
    const needsUpdate = false;
    this.allViews((view) => {
      return view.tick(cycleStart) || needsUpdate;
    });
    return needsUpdate;
  }

  hasPizza(projector: Projector): boolean {
    return this._projections.has(projector);
  }

  pizzaFor(projector: Projector) {
    return this._projections.get(projector);
  }

  unmount(projector: Projector): void {
    if (!this.hasPizza(projector)) {
      return;
    }
    this.pizzaFor(projector).eachView((view) => view.unmount());
    this._projections.delete(projector);
  }

  dispose() {
    this.allViews((view) => {
      view.unmount();
    });
    this._projections.clear();
  }

  root() {
    return this._root;
  }

  paint(projector: Projector, timeout?: number): boolean {
    const root = this.root();
    if (root.needsCommit()) {
      throw new Error("Node cannot be uncommitted when painting");
    }

    if (!this.hasPizza(projector)) {
      const pizza = new Pizza(projector);
      pizza.setOnScheduleUpdate(this.scheduleUpdate, this);
      this._projections.set(projector, pizza);
    }
    const pizza = this.pizzaFor(projector);

    pizza.populate(this.root());
    const needsRepaint = pizza.paint(timeout);

    return needsRepaint;
  }

  isPainted(projector: Projector) {
    return !!this.pizzaFor(projector);
  }

  bounds() {
    const b = new Rect();
    this.root().forEachNode((node: PaintedNode) => {
      const layout = node.value().getLayout();
      b.include(
        layout.groupX(),
        layout.groupY(),
        layout.groupSize().width(),
        layout.groupSize().height()
      );
    });
    return b;
  }

  camera() {
    return this._camera;
  }

  setCamera(cam: Camera) {
    this._camera = cam;
  }

  labels() {
    return this._labels;
  }

  setLabels(labels: WorldLabels) {
    this._labels = labels;
  }

  layout() {
    return this.root().value().getLayout();
  }

  worldMatrix() {
    if (!this.camera() || !this.camera().canProject()) {
      return matrixIdentity3x3();
    }
    const world: Matrix3x3 = this.camera().project();
    const layout = this.layout();
    makeScale3x3I(renderData.scaleMat, layout.absoluteScale());
    makeTranslation3x3I(
      renderData.transMat,
      layout.absoluteX(),
      layout.absoluteY()
    );
    matrixMultiply3x3I(
      renderData.worldMat,
      renderData.scaleMat,
      renderData.transMat
    );
    return matrixMultiply3x3I(renderData.worldMat, renderData.worldMat, world);
  }

  worldScale() {
    return (
      this.layout().absoluteScale() *
      (this.camera() ? this.camera().scale() : 1)
    );
  }

  render(projector: Projector): boolean {
    if (!this.root().isRoot() && !this.root().localPaintGroup()) {
      throw new Error("Cannot render a node that is not a paint group");
    }
    if (!this.isPainted(projector)) {
      return true;
    }

    const layout = this.root().value().getLayout();
    if (layout.needsAbsolutePos()) {
      return true;
    }

    // Get paint group bounds, transformed to world space.
    const s: Rect = this.bounds().clone(renderData.bounds);
    s.scale(this.root().state().scale());
    s.translate(layout.absoluteX(), layout.absoluteY());

    // Check if paint group would be visible.
    const camera = this.camera();
    if (!camera) {
      return true;
    }
    if (!camera.containsAny(s)) {
      return layout.needsAbsolutePos();
    }

    log(
      "Rendering paint group: ",
      layout.absoluteX(),
      layout.absoluteY(),
      layout.absoluteScale()
    );

    // Check if node is frozen.
    if (
      this.root().value().getCache().isFrozen()
      // && renderScale < FREEZER_TEXTURE_SCALE
    ) {
      log(
        "Rendering " + this + " from cache. CACHED_RENDERS = ",
        CACHED_RENDERS
      );
      const cleanRender = this.root()
        .value()
        .getCache()
        .frozenNode()
        .render(projector, this.worldMatrix(), true);
      if (IMMEDIATE_RENDERS > 0) {
        log("Immediately rendered ", IMMEDIATE_RENDERS, " times");
        IMMEDIATE_RENDERS = 0;
      }
      ++CACHED_RENDERS;
      return !cleanRender || layout.needsAbsolutePos();
    }

    // Check if we were cached before this render.
    if (CACHED_RENDERS > 0) {
      log("Rendered from cache ", CACHED_RENDERS, " times");
      // Clear cached render counter, since this is an immediate render.
      CACHED_RENDERS = 0;
    }
    ++IMMEDIATE_RENDERS;

    // Set up 2D canvas
    const needsUpdate = false;
    if (projector.hasOverlay()) {
      projector.overlay().save();
    }
    try {
      if (camera && projector.hasOverlay()) {
        const overlay = projector.overlay();
        overlay.scale(camera.scale(), camera.scale());
        overlay.translate(
          camera.x() + layout.absoluteX(),
          camera.y() + layout.absoluteY()
        );
        overlay.scale(layout.absoluteScale(), layout.absoluteScale());
      }

      this.renderDirect(
        projector,
        camera
          ? new WorldTransform(
              this.worldMatrix(),
              this.worldScale(),
              camera.width(),
              camera.height(),
              camera.x() + layout.absoluteX(),
              camera.y() + layout.absoluteY()
            )
          : null
      );
    } finally {
      if (projector.hasOverlay()) {
        projector.overlay().restore();
      }
    }

    return needsUpdate || layout.needsAbsolutePos();
  }

  renderDirect(projector: Projector, world: WorldTransform): boolean {
    let needsUpdate = false;
    const pizza = this.pizzaFor(projector);
    if (pizza) {
      pizza.setWorldTransform(world);
      needsUpdate = pizza.render() || needsUpdate;
    } else {
      needsUpdate = true;
    }
    return needsUpdate || this.root().value().getLayout().needsAbsolutePos();
  }

  scheduleUpdate() {
    this._onScheduleUpdate.call();
  }

  setOnScheduleUpdate(listener: () => void, listenerObj?: object): void {
    this._onScheduleUpdate.set(listener, listenerObj);
  }
}
