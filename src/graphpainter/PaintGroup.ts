import ProjectedNode from "../ProjectedNode";
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
  matrixIdentity3x3,
} from "parsegraph-matrix";
import Rect from "parsegraph-rect";
import NodeRenderData from "../NodeRenderData";
import WorldTransform from "../WorldTransform";
import NodeValues from "../NodeValues";
import Artist, { WorldRenderable } from "../Artist";
import { Renderable } from "parsegraph-timingbelt";

let CACHED_RENDERS: number = 0;
let IMMEDIATE_RENDERS: number = 0;

const renderData: NodeRenderData = new NodeRenderData();

export default class PaintGroup implements Projected {
  _root: ProjectedNode;
  _projections: Map<Projector, [Artist, WorldRenderable][]>;
  _consecutiveRenders: number;
  _onScheduleUpdate: Method;
  _camera: Camera;

  constructor(root: ProjectedNode) {
    this._root = root;
    this._projections = new Map();
    this._consecutiveRenders = 0;
    this._onScheduleUpdate = new Method();
  }

  consecutiveRenders(): number {
    return this._consecutiveRenders;
  }

  forEachSlice(cb: (slice: Renderable) => void): void {
    this._projections.forEach((slices) => {
      slices.forEach((slice) => cb(slice[1]));
    });
  }

  tick(cycleStart: number): boolean {
    const needsUpdate = false;
    this.forEachSlice((slice) => {
      return slice.tick(cycleStart) || needsUpdate;
    });
    return needsUpdate;
  }

  hasSlices(projector: Projector): boolean {
    return this._projections.has(projector);
  }

  getSlices(projector: Projector) {
    return this._projections.get(projector);
  }

  unmount(projector: Projector): void {
    if (!this.hasSlices(projector)) {
      return;
    }
    // this.getSlices(projector).forEach(slice=>slice.unmount());
    this._projections.delete(projector);
  }

  dispose() {
    this.forEachSlice((slice) => {
      slice.unmount();
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

    if (!this.hasSlices(projector)) {
      this._projections.set(projector, []);
    }
    const slices = this._projections.get(projector);

    let seq: NodeValues = null;
    let seqArtist: Artist = null;

    let currentSlice = 0;

    // Adds the current node value sequence as a new Renderable
    // created from the root node's Artist.
    const commit = () => {
      if (!seq) {
        return;
      }
      if (currentSlice < slices.length) {
        const slice = slices[currentSlice];
        if (seqArtist === slice[0] && seqArtist.patch(slice[1], seq)) {
          // Slice is patchable, so re-use it.
          currentSlice++;
          return;
        } else {
          // Renderable cannot be patched, so remove it and replace.
          slices[currentSlice][1].unmount();
          slices.splice(currentSlice, 1);
        }
      }

      // Create a new slice.
      const renderable = seqArtist.make(projector, seq);
      renderable.setOnScheduleUpdate(this.scheduleUpdate, this);
      slices.splice(currentSlice++, 0, [seqArtist, renderable]);
    };

    root.forEachNode((node: ProjectedNode) => {
      const artist = node.value().artist();
      if (!seq || seqArtist !== artist) {
        // Artist has changed, so commit the current sequence, if any.
        commit();

        // Artist has changed, so start a new sequence.
        seq = new NodeValues(node);
        seqArtist = artist;
      } else {
        // Artist did not change, so include node in current sequence.
        seq.include();
      }
    });

    // Include last sequence.
    commit();

    while (slices.length > currentSlice) {
      const slice = slices.pop();
      slice[1].unmount();
    }

    let needsRepaint = false;
    slices.forEach((slice) => {
      const renderable = slice[1];
      needsRepaint = renderable.paint(timeout / slices.length) || needsRepaint;
    });

    if (!needsRepaint) {
      log("Clearing dirty flag");
      if (root.value().getCache().isFrozen()) {
        root.value().getCache().frozenNode().paint(this, projector);
      }
    }

    return needsRepaint;
  }

  /**
   * Render using the given world matrix.
   *
   * @param {Projector} projector Projector used for rendering
   * @param {WorldTransform} worldTransform the transform used for 2D orthographic projections
   * @return {boolean} true if another render call is needed to complete rendering
   */
  renderDirect(projector: Projector, worldTransform: WorldTransform): boolean {
    if (!this.root().isRoot() && !this.root().localPaintGroup()) {
      throw new Error("Cannot render a node that is not a paint group");
    }
    if (!this.hasSlices(projector)) {
      return true;
    }

    logEnter("Rendering directly");
    ++this._consecutiveRenders;

    let needsUpdate = false;
    this.getSlices(projector).forEach((slice) => {
      const renderable = slice[1];
      renderable.setWorldTransform(worldTransform);
      needsUpdate = renderable.render() || needsUpdate;
    });
    logLeave();
    return needsUpdate;
  }

  isPainted(projector: Projector) {
    return this.hasSlices(projector);
  }

  bounds() {
    const b = new Rect();
    this.root().forEachNode((node: ProjectedNode) => {
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
    let needsUpdate = false;
    if (projector.hasOverlay()) {
      projector.overlay().save();
    }
    try {
      if (projector.hasOverlay()) {
        const overlay = projector.overlay();
        overlay.scale(camera.scale(), camera.scale());
        overlay.translate(
          camera.x() + layout.absoluteX(),
          camera.y() + layout.absoluteY()
        );
        overlay.scale(layout.absoluteScale(), layout.absoluteScale());
      }

      const worldTransform = new WorldTransform(
        this.worldMatrix(),
        this.worldScale(),
        camera.width(),
        camera.height(),
        camera.x() + layout.absoluteX(),
        camera.y() + layout.absoluteY()
      );
      needsUpdate = this.renderDirect(projector, worldTransform);
    } finally {
      if (projector.hasOverlay()) {
        projector.overlay().restore();
      }
    }

    return needsUpdate || layout.needsAbsolutePos();
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
