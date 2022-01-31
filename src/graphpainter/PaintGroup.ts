import ProjectedNode from "../ProjectedNode";
import PaintSubgroup from "./PaintSubgroup";
import Camera from "parsegraph-camera";
import log, { logEnter, logLeave } from "parsegraph-log";
import { Projector } from "parsegraph-projector";
import { Projected } from "parsegraph-projector";
import Method from "parsegraph-method";

import {
  makeScale3x3I,
  makeTranslation3x3I,
  matrixMultiply3x3I,
  Matrix3x3,
} from "parsegraph-matrix";
import Rect from "parsegraph-rect";
import NodeRenderData from "../NodeRenderData";
import WorldTransform from "../WorldTransform";

let CACHED_RENDERS: number = 0;
let IMMEDIATE_RENDERS: number = 0;

const renderData: NodeRenderData = new NodeRenderData();

export default class PaintGroup implements Projected {
  _root: ProjectedNode;
  _subgroups: PaintSubgroup[];
  _consecutiveRenders: number;
  _bounds: Rect;
  _onScheduleUpdate: Method;
  _camera: Camera;

  constructor(root: ProjectedNode) {
    this._root = root;
    this._subgroups = [];
    this._consecutiveRenders = 0;
    this._bounds = new Rect();
    this._onScheduleUpdate = new Method();
  }

  consecutiveRenders(): number {
    return this._consecutiveRenders;
  }

  tick(cycleStart: number): boolean {
    return this._subgroups.reduce((needsUpdate, subgroup) => {
      return subgroup.tick(cycleStart) || needsUpdate;
    }, false);
  }

  unmount(projector: Projector): void {
    this._subgroups.forEach((subgroup) => subgroup.unmount(projector));
  }

  root() {
    return this._root;
  }

  paint(projector: Projector, timeout?: number): boolean {
    const root = this.root();
    if (root.needsCommit()) {
      throw new Error("Node cannot be uncommitted when painting");
    }

    if (!this._subgroups || this._subgroups.length === 0) {
      let subgroup: PaintSubgroup = null;

      root.forEachNode((node: ProjectedNode) => {
        const artist = node.value().artist();
        if (!subgroup || subgroup.artist() !== artist) {
          subgroup = new PaintSubgroup(node);
          subgroup.setOnScheduleUpdate(this.scheduleUpdate, this);
          this._subgroups.push(subgroup);
        } else {
          subgroup.addNode();
        }
      });
    }

    let needsRepaint = false;
    this._subgroups.forEach((subgroup) => {
      needsRepaint = subgroup.paint(projector, timeout) || needsRepaint;
      const b = subgroup.bounds(projector);
      log("Bounds", b);
      this._bounds = b; // .include(b.x(), b.y(), b.width(), b.height());
      log("Included bounds", this._bounds);
    });

    if (!needsRepaint) {
      log("Clearing dirty flag");
      root.clearDirty();
      if (root.value().getCache().isFrozen()) {
        root.value().getCache().frozenNode().paint(this, projector);
      }
    }

    return needsRepaint;
  }

  renderDirect(
    projector: Projector,
    renderWorld: Matrix3x3,
    renderScale: number
  ): boolean {
    if (!this.root().isRoot() && !this.root().localPaintGroup()) {
      throw new Error("Cannot render a node that is not a paint group");
    }
    logEnter("Rendering directly");
    ++this._consecutiveRenders;

    const worldTransform = new WorldTransform(
      renderWorld,
      renderScale,
      this.camera().width(),
      this.camera().height()
    );
    let needsUpdate = false;
    this._subgroups.forEach((group) => {
      group.setWorldTransform(worldTransform);
      needsUpdate = group.render(projector) || needsUpdate;
    });
    logLeave();
    return needsUpdate;
  }

  isPainted() {
    return this._subgroups.length > 0;
  }

  bounds() {
    return this._bounds;
  }

  camera() {
    return this._camera;
  }

  setCamera(cam: Camera) {
    this._camera = cam;
  }

  render(projector: Projector): boolean {
    //camera: Camera, renderData?: NodeRenderData): boolean {
    // console.log("RENDERING THE NODE");
    if (!this.root().isRoot() && !this.root().localPaintGroup()) {
      throw new Error("Cannot render a node that is not a paint group");
    }
    if (!this.isPainted()) {
      log("Node has no painter for " + projector);
      return true;
    }

    const layout = this.root().value().getLayout();
    if (layout.needsAbsolutePos()) {
      log("Node has no absolute pos");
      return true;
    }

    // Do not render paint groups that cannot be seen.
    const s: Rect = this.bounds().clone(renderData.bounds);
    s.scale(this.root().scale());
    s.translate(layout.absoluteX(), layout.absoluteY());
    const camera = this.camera();
    if (camera && !camera.containsAny(s)) {
      log(
        "Out of bounds: ",
        this,
        s,
        "x,y",
        camera.x(),
        camera.y(),
        "w,h",
        camera.width(),
        camera.height(),
        "Scale",
        camera.scale()
      );
      return layout.needsAbsolutePos();
    }

    const world: Matrix3x3 = camera.project();
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
    const renderWorld: Matrix3x3 = matrixMultiply3x3I(
      renderData.worldMat,
      renderData.worldMat,
      world
    );
    const renderScale: number =
      layout.absoluteScale() * (camera ? camera.scale() : 1);

    log(
      "Rendering paint group: ",
      layout.absoluteX(),
      layout.absoluteY(),
      layout.absoluteScale()
    );
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
        .render(projector, renderWorld, renderData, true);
      if (IMMEDIATE_RENDERS > 0) {
        log("Immediately rendered ", IMMEDIATE_RENDERS, " times");
        IMMEDIATE_RENDERS = 0;
      }
      ++CACHED_RENDERS;
      return !cleanRender || layout.needsAbsolutePos();
    }
    if (CACHED_RENDERS > 0) {
      log("Rendered from cache ", CACHED_RENDERS, " times");
      CACHED_RENDERS = 0;
    }
    ++IMMEDIATE_RENDERS;
    const overlay = projector.overlay();
    overlay.save();
    projector.overlay().scale(camera.scale(), camera.scale());
    projector
      .overlay()
      .translate(
        camera.x() + layout.absoluteX(),
        camera.y() + layout.absoluteY()
      );
    projector.overlay().scale(layout.absoluteScale(), layout.absoluteScale());
    this.renderDirect(projector, renderWorld, renderScale);
    overlay.restore();

    if (layout.needsAbsolutePos()) {
      log("Node was rendered with dirty absolute position.");
    }
    if (this.root().isDirty()) {
      log("Node was rendered dirty.");
    }
    return this.root().isDirty() || layout.needsAbsolutePos();
  }

  contextChanged(projector: Projector, isLost: boolean) {
    if (isLost) {
      this.unmount(projector);
    }
  }

  scheduleUpdate() {
    this._onScheduleUpdate.call();
  }

  setOnScheduleUpdate(listener: () => void, listenerObj?: object): void {
    this._onScheduleUpdate.set(listener, listenerObj);
  }
}
