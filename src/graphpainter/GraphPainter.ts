import Camera from "parsegraph-camera";

import log, { logEnter, logLeave } from "parsegraph-log";
import WindowNode from "../WindowNode";
import GraphPainterSlice from "./GraphPainterSlice";
import { Projector, Projected } from "parsegraph-projector";
import Method from "parsegraph-method";

export default class GraphPainter implements Projected {
  _root: WindowNode;

  _slices: Map<Projector, GraphPainterSlice>;
  _commitLayoutFunc: Function;
  _camera: Camera;
  _onScheduleUpdate: Method;

  constructor(root: WindowNode, cam: Camera) {
    logEnter("Constructing GraphPainter");
    this._root = root;
    this._slices = new Map();
    this._commitLayoutFunc = null;
    this._camera = cam;
    this._onScheduleUpdate = new Method();

    this._root.setDirtyListener(this.markDirty, this);
    logLeave();
  }

  tick(elapsed: number): boolean {
    let needsUpdate = false;
    this._slices.forEach((slice) => {
      needsUpdate = slice.tick(elapsed) || needsUpdate;
    });
    return needsUpdate;
  }

  unmount(projector: Projector): void {
    if (!this._slices.has(projector)) {
      return;
    }
    const slice = this._slices.get(projector);
    slice.unmount();
    this._slices.delete(projector);
  }

  contextChanged(projector: Projector, isLost: boolean): void {
    if (!this._slices.has(projector)) {
      return;
    }
    const slice = this._slices.get(projector);
    slice.contextChanged(isLost);
  }

  setOnScheduleUpdate(listener: () => void, listenerObj?: object): void {
    this._onScheduleUpdate.set(listener, listenerObj);
  }

  root(): WindowNode {
    return this._root;
  }

  markDirty(): void {
    if (this.root().value().getCache().isFrozen()) {
      this.root().value().getCache().frozenNode().invalidate();
    }
    this._commitLayoutFunc = null;
    this._slices.forEach((slice) => {
      slice.markDirty();
    });
    this._onScheduleUpdate.call();
  }

  commitLayout(timeout?: number): boolean {
    // Commit layout
    let cont: Function;
    if (this._commitLayoutFunc) {
      log("Continuing commit layout");
      cont = this._commitLayoutFunc(timeout);
    } else {
      log("Beginning new commit layout");
      cont = this.root().value().getLayout().commitLayoutIteratively(timeout);
    }
    if (cont) {
      log("Commit layout is not complete");
      this._commitLayoutFunc = cont;
      return true;
    }
    log("Commit layout complete");
    this._commitLayoutFunc = null;
    return false;
  }

  paint(projector: Projector, timeout?: number): boolean {
    if (!this.root().isRoot() && !this.root().localPaintGroup()) {
      throw new Error("A node must be a paint group in order to be painted");
    }

    if (this.commitLayout(timeout)) {
      return true;
    }

    if (!this._slices.has(projector)) {
      this._slices.set(
        projector,
        new GraphPainterSlice(projector, this.root())
      );
    }
    const slice = this._slices.get(projector);
    return slice.paint(timeout);
  }

  camera(): Camera {
    return this._camera;
  }

  render(projector: Projector): boolean {
    if (!this._slices.has(projector)) {
      // No painter for window.
      return true;
    }
    const slice = this._slices.get(projector);
    return slice.render(this.camera());
  }
}
