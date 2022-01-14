import WindowNode from "../WindowNode";
import PaintSubgroup from "./PaintSubgroup";
import Camera from "parsegraph-camera";
import log, { logEnter, logLeave } from "parsegraph-log";
import { Projector } from "parsegraph-projector";

import {
  makeScale3x3I,
  makeTranslation3x3I,
  matrixMultiply3x3I,
  Matrix3x3,
} from "parsegraph-matrix";
import Rect from "parsegraph-rect";
import NodeRenderData from "../NodeRenderData";

let CACHED_RENDERS: number = 0;
let IMMEDIATE_RENDERS: number = 0;

export default class PaintGroup {
  _projector: Projector;
  _root: WindowNode;
  _subgroups: PaintSubgroup[];
  _consecutiveRenders: number;
  _bounds: Rect;

  constructor(projector: Projector, root: WindowNode) {
    this._projector = projector;
    this._root = root;
    this._subgroups = [];
    this._consecutiveRenders = 0;
    this._bounds = new Rect();
  }

  consecutiveRenders(): number {
    return this._consecutiveRenders;
  }

  tick(elapsed: number): boolean {
    return this._subgroups.reduce((needsUpdate, subgroup) => {
      return subgroup.tick(elapsed) || needsUpdate;
    }, false);
  }

  contextChanged(isLost: boolean): void {
    this._subgroups.forEach((subgroup) => subgroup.contextChanged(isLost));
  }

  unmount(): void {
    this._subgroups.forEach((subgroup) => subgroup.unmount());
  }

  root() {
    return this._root;
  }

  paint(): boolean {
    const paintGroup = this.root();
    if (paintGroup.needsCommit()) {
      throw new Error("Need commit even though we should be done");
    }
    if (!paintGroup.isDirty()) {
      return;
    }

    let subgroup: PaintSubgroup = null;

    paintGroup.forEachNode((node: WindowNode) => {
      const artist = node.value().getArtist();
      if (!subgroup || subgroup.artist() != artist) {
        subgroup = new PaintSubgroup(this._projector, artist, node);
        this._subgroups.push(subgroup);
      } else {
        subgroup.addNode();
      }
    });

    let needsRepaint = false;
    this._subgroups.forEach((subgroup) => {
      needsRepaint = subgroup.paint() || needsRepaint;
      const b = subgroup.bounds();
      log("Bounds", b);
      this._bounds = b; // .include(b.x(), b.y(), b.width(), b.height());
      log("Included bounds", this._bounds);
    });

    if (!needsRepaint) {
      log("Clearing dirty flag");
      this.root().clearDirty();
      if (paintGroup.value().getCache().isFrozen()) {
        paintGroup.value().getCache().frozenNode().paint(this);
      }
    }

    return needsRepaint;
  }

  renderDirect(
    renderWorld: Matrix3x3,
    renderScale: number,
    forceSimple: boolean,
    cam: Camera
  ): boolean {
    if (!this.root().isRoot() && !this.root().localPaintGroup()) {
      throw new Error("Cannot render a node that is not a paint group");
    }
    logEnter("Rendering directly");
    ++this._consecutiveRenders;
    this._subgroups.forEach((group) => {
      group.render(renderWorld, renderScale, forceSimple, cam);
    });
    logLeave();
    return false;
  }

  isPainted() {
    return this._subgroups.length > 0;
  }

  projector() {
    return this._projector;
  }

  bounds() {
    return this._bounds;
  }

  render(camera: Camera, renderData?: NodeRenderData): boolean {
    // console.log("RENDERING THE NODE");
    if (!this.root().isRoot() && !this.root().localPaintGroup()) {
      throw new Error("Cannot render a node that is not a paint group");
    }
    const projector = this.projector();
    if (!this.isPainted()) {
      log("Node has no painter for " + projector);
      return true;
    }

    const layout = this.root().value().getLayout();
    if (layout.absoluteX() === null) {
      log("Node has no absolute pos");
      return true;
    }

    if (!renderData) {
      renderData = new NodeRenderData();
    }

    // Do not render paint groups that cannot be seen.
    const s: Rect = this.bounds().clone(renderData.bounds);
    s.scale(this.root().scale());
    s.translate(layout.absoluteX(), layout.absoluteY());
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
      return layout._absoluteDirty;
    }

    const world: Matrix3x3 = camera.project();
    makeScale3x3I(renderData.scaleMat, layout._absoluteScale);
    makeTranslation3x3I(
      renderData.transMat,
      layout._absoluteXPos,
      layout._absoluteYPos
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
      layout._absoluteScale * (camera ? camera.scale() : 1);

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
      return !cleanRender || layout._absoluteDirty;
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
    this.renderDirect(renderWorld, renderScale, false, camera);
    overlay.restore();

    if (layout._absoluteDirty) {
      log("Node was rendered with dirty absolute position.");
    }
    if (this.root().isDirty()) {
      log("Node was rendered dirty.");
    }
    return this.root().isDirty() || layout._absoluteDirty;
  }
}
