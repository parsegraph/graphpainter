import ProjectedNode from "../ProjectedNode";
import Rect from "parsegraph-rect";
import { Projector, Projected } from "parsegraph-projector";
import Method from "parsegraph-method";
import WorldTransform from "../WorldTransform";

export default class PaintSubgroup<T extends Projected = Projected>
  implements Projected {
  _root: ProjectedNode<T>;
  _length: number;
  _projected: T;
  _onScheduleUpdate: Method;

  constructor(root: ProjectedNode<T>) {
    this._root = root;
    this._length = 1;
    this._projected = null;
    this._onScheduleUpdate = new Method();
  }

  contextChanged(projector: Projector, isLost: boolean) {
    if (isLost) {
      this.unmount(projector);
    }
  }

  projected(): T {
    return this._projected;
  }

  root() {
    return this._root;
  }

  artist() {
    return this.root().value().artist();
  }

  tick(cycleTime: number): boolean {
    if (!this.projected()) {
      return false;
    }
    return this.projected().tick(cycleTime);
  }

  unmount(projector: Projector): void {
    if (!this.projected()) {
      return;
    }
    this.projected().unmount(projector);
  }

  setWorldTransform(worldTransform: WorldTransform) {
    this.artist().setWorldTransform(this.projected(), worldTransform);
  }

  paint(projector: Projector, timeout?: number): boolean {
    if (!this.projected()) {
      this._projected = this.artist().make(this);
    }
    return this.projected().paint(projector, timeout);
  }

  render(projector: Projector): boolean {
    if (!this.projected()) {
      return true;
    }
    return this.projected().render(projector, undefined, undefined);
  }

  addNode() {
    ++this._length;
  }

  iterate(): () => ProjectedNode<T> {
    let n = this._root;
    let i = 0;
    return () => {
      if (i >= this._length) {
        return null;
      }
      ++i;
      const rv = n;
      n = n.nextLayout();
      return rv;
    };
  }

  forEachNode(cb: (node: ProjectedNode<T>) => void) {
    let n = this._root;
    for (let i = 0; i < this._length; ++i) {
      cb(n);
      n = n.nextLayout();
    }
  }

  bounds(projector: Projector): Rect {
    return this.artist().bounds(projector, this.projected());
  }

  scheduleUpdate() {
    this._onScheduleUpdate.call();
  }

  setOnScheduleUpdate(listener: () => void, listenerObj?: object): void {
    this._onScheduleUpdate.set(listener, listenerObj);
  }
}
