import Camera from "parsegraph-camera";
import GraphPainterAnalytics from "./GraphPainterAnalytics";

import log, { logEnter, logEnterc, logLeave } from "parsegraph-log";
import { PaintedNode } from "parsegraph-artist";
import { WorldTransform, WorldLabels } from 'parsegraph-scene';
import { Projector, Projected } from "parsegraph-projector";
import Method from "parsegraph-method";
import PaintGroup from "./PaintGroup";

const timer = (timeout: number) => {
  const t: number = new Date().getTime();
  return function (): boolean {
    const isPast: boolean =
      timeout !== undefined && new Date().getTime() - t > timeout;
    if (isPast) {
      log(
        "Past time: timeout={0}, elapsed={1}",
        timeout,
        new Date().getTime() - t
      );
    }
    return isPast;
  };
};

export default class GraphPainter implements Projected {
  _root: PaintedNode;
  _savedPaintGroup: number;
  _paintGroups: PaintGroup[];

  _commitLayoutFunc: Function;
  _camera: Camera;
  _onScheduleUpdate: Method;
  _worldLabels: WorldLabels;

  constructor(root: PaintedNode = null, cam: Camera = null) {
    logEnter("Constructing GraphPainter");
    this._root = root;
    this._commitLayoutFunc = null;
    this._camera = cam;
    this._onScheduleUpdate = new Method();
    this._worldLabels = new WorldLabels();

    this.clear();
    logLeave();
  }

  isDirty() {
    return this._savedPaintGroup < this._paintGroups.length;
  }

  tick(cycleStart: number): boolean {
    if (!this._paintGroups) {
      return false;
    }
    return this._paintGroups.reduce((needsUpdate, pg) => {
      return pg.tick(cycleStart) || needsUpdate;
    }, false);
  }

  unmount(projector: Projector): void {
    if (!this._paintGroups) {
      return;
    }
    this._paintGroups.forEach((pg) => pg.unmount(projector));
  }

  dispose() {
    this._paintGroups.forEach((pg) => pg.dispose());
  }

  setOnScheduleUpdate(listener: () => void, listenerObj?: object): void {
    this._onScheduleUpdate.set(listener, listenerObj);
  }

  root(): PaintedNode {
    return this._root;
  }

  setRoot(root: PaintedNode) {
    this.clear();
    this._root = root;
    this.markDirty();
  }

  clear() {
    if (this._paintGroups) {
      this._paintGroups.forEach((pg) => {
        pg.dispose();
      });
    }
    this._commitLayoutFunc = null;
    this._paintGroups = [];
    this._savedPaintGroup = -1;
  }

  markDirty(): void {
    if (this.root() && this.root().value().getCache().isFrozen()) {
      this.root().value().getCache().frozenNode().invalidate();
    }
    this._commitLayoutFunc = null;
    this._savedPaintGroup = -1;
    this._onScheduleUpdate.call();
  }

  commitLayout(timeout?: number): boolean {
    if (!this.root()) {
      this._commitLayoutFunc = null;
      return false;
    }
    // Commit layout
    let cont: Function;
    if (this._commitLayoutFunc) {
      cont = this._commitLayoutFunc(timeout);
    } else {
      cont = this.root().value().getLayout().commitLayoutIteratively(timeout);
    }
    if (cont) {
      this._commitLayoutFunc = cont;
      return true;
    }
    this._commitLayoutFunc = null;
    return false;
  }

  private reconcilePaintGroups() {
    // Create paint groups
    let node = this.root();
    if (this._savedPaintGroup !== -1) {
      return;
    }
    let i = 0;
    do {
      if (this._paintGroups.length < i) {
        const pg = this._paintGroups[i];
        if (pg.root() === node) {
          // If the paint group's root is the same node, re-use it.
        } else {
          // Different root, so create a new paint group.
          this._paintGroups.splice(i, 0, new PaintGroup(node));
        }
      } else {
        this._paintGroups.push(new PaintGroup(node));
      }
      ++i;
      node = node.paintGroup().next() as PaintedNode;
    } while (node != this.root());

    // Remove trailing stale paint groups
    while (this._paintGroups.length > i) {
      const pg = this._paintGroups.pop();
      pg.dispose();
    }
    this._savedPaintGroup = 0;
  }

  paint(projector: Projector, timeout?: number): boolean {
    if (!this.root()) {
      return false;
    }
    if (!this.root().isRoot() && !this.root().localPaintGroup()) {
      throw new Error("A node must be a paint group in order to be painted");
    }

    logEnterc("Node paints", "Painting node for window={0}", window);
    log("{0} has paint group {1}", this.root(), this._savedPaintGroup);

    const pastTime = timer(timeout);

    if (this.commitLayout(timeout)) {
      logLeave("Commit layout");
      return true;
    }

    if (pastTime()) {
      logLeave("Paint timeout=" + timeout);
      return true;
    }

    this.reconcilePaintGroups();

    if (pastTime()) {
      logLeave("Paint timeout=" + timeout);
      return true;
    }

    while (this._savedPaintGroup < this._paintGroups.length) {
      if (pastTime()) {
        logLeave("Ran out of time during painting (timeout={0})", timeout);
        return true;
      }

      const pg = this._paintGroups[this._savedPaintGroup];
      if (pg.paint(projector)) {
        logLeave("Painting needs another update");
        return true;
      }

      this._savedPaintGroup++;
    }

    // Finalize painting
    logLeave("Completed node painting");
    this._savedPaintGroup = 0;
    return false;
  }

  camera(): Camera {
    return this._camera;
  }

  setCamera(cam: Camera) {
    this._camera = cam;
  }

  labels(): WorldLabels {
    return this._worldLabels;
  }

  render(projector: Projector): boolean {
    if (!this.root()) {
      return false;
    }
    const analytics = new GraphPainterAnalytics(projector);
    analytics.recordStart();

    this.labels().clear();
    this._paintGroups.forEach((pg) => {
      pg.setCamera(this.camera());
      pg.setLabels(this.labels());
      const pizza = pg.pizzaFor(projector);
      if (pg.render(projector)) {
        analytics.recordDirtyRender();
      } else if (pizza.numRenders() > 1) {
        analytics.recordConsecutiveRender();
        analytics.recordNumRenders(pizza.numRenders());
      }
    });
    WorldTransform.fromCamera(null, this.camera()).applyTransform(projector, null, this.camera().scale());
    this.labels().render(projector, this.camera().scale());

    analytics.recordCompletion();
    return analytics.isDirty();
  }
}
