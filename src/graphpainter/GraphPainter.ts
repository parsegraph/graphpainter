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
    this.markDirty();
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

  contextChanged(projector: Projector, isLost: boolean): void {
    if (isLost) {
      this.unmount(projector);
    }
  }

  setOnScheduleUpdate(listener: () => void, listenerObj?: object): void {
    this._onScheduleUpdate.set(listener, listenerObj);
  }

  root(): ProjectedNode {
    return this._root;
  }

  markDirty(): void {
    if (this.root().value().getCache().isFrozen()) {
      this.root().value().getCache().frozenNode().invalidate();
    }
    this._commitLayoutFunc = null;
    /* this._paintGroups.forEach(pg=>{
      pg.dispose();
    });*/
    this._paintGroups = [];
    this._savedPaintGroup = -1;
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

    logEnterc("Node paints", "Painting node for window={0}", window);
    log("{0} has paint group {1}", this.root(), this._savedPaintGroup);
    log("{0} is dirty={1}", this.root(), this.root().isDirty());

    if (timeout <= 0) {
      logLeave("Paint timeout=" + timeout);
      return true;
    }

    // Create paint groups
    if (this._paintGroups.length === 0) {
      let node = this.root();
      do {
        this._paintGroups.push(new PaintGroup(node));
        node = node.nextPaintGroup();
      } while (node != this.root());
      this._savedPaintGroup = 0;
    }
    const pastTime = timer(timeout);
    while (this._savedPaintGroup < this._paintGroups.length) {
      if (pastTime()) {
        this.root()._dirty = true;
        logLeave("Ran out of time during painting (timeout={0})", timeout);
        return true;
      }

      const pg = this._paintGroups[this._savedPaintGroup];
      if (pg.paint(projector)) {
        return true;
      }

      this._savedPaintGroup++;
    }

    // Finalize painting
    logLeave("Completed node painting");
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
