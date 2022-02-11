import Camera from "parsegraph-camera";
import GraphPainterAnalytics from "./GraphPainterAnalytics";

import log, { logEnter, logEnterc, logLeave } from "parsegraph-log";
import ProjectedNode from "../ProjectedNode";
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
  _root: ProjectedNode;
  _savedPaintGroup: number;
  _paintGroups: PaintGroup[];

  _commitLayoutFunc: Function;
  _camera: Camera;
  _onScheduleUpdate: Method;

  constructor(root: ProjectedNode, cam: Camera) {
    logEnter("Constructing GraphPainter");
    this._root = root;
    this._commitLayoutFunc = null;
    this._camera = cam;
    this._onScheduleUpdate = new Method();

    this._root.setDirtyListener(this.markDirty, this);
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

  root(): ProjectedNode {
    return this._root;
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
    if (this.root().value().getCache().isFrozen()) {
      this.root().value().getCache().frozenNode().invalidate();
    }
    this._commitLayoutFunc = null;
    this._savedPaintGroup = -1;
    this._onScheduleUpdate.call();
  }

  commitLayout(timeout?: number): boolean {
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

  paint(projector: Projector, timeout?: number): boolean {
    if (!this.root().isRoot() && !this.root().localPaintGroup()) {
      throw new Error("A node must be a paint group in order to be painted");
    }

    if (this.commitLayout(timeout)) {
      return true;
    }

    logEnterc("Node paints", "Painting node for window={0}", window);
    log("{0} has paint group {1}", this.root(), this._savedPaintGroup);

    const pastTime = timer(timeout);

    if (pastTime()) {
      logLeave("Paint timeout=" + timeout);
      return true;
    }

    // Create paint groups
    let node = this.root();
    if (this._savedPaintGroup === -1) {
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
        node = node.nextPaintGroup();
      } while (node != this.root());

      // Remove trailing stale paint groups
      while (this._paintGroups.length > i) {
        const pg = this._paintGroups.pop();
        pg.dispose();
      }
      this._savedPaintGroup = 0;
    }

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

  render(projector: Projector): boolean {
    const analytics = new GraphPainterAnalytics();
    analytics.recordStart();

    this._paintGroups.forEach((pg) => {
      pg.setCamera(this.camera());
      if (pg.render(projector)) {
        analytics.recordDirtyRender();
      } else if (pg.consecutiveRenders() > 1) {
        analytics.recordConsecutiveRender(pg);
      }
    });

    analytics.recordCompletion();
    return analytics.isDirty();
  }
}
