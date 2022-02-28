import { DirectionNode } from "parsegraph-direction";

export default class NodeValues<Value = any> {
  _root: DirectionNode<Value>;
  _length: number;

  constructor(root: DirectionNode<Value>) {
    this._root = root;
    this._length = 1;
  }

  root() {
    return this._root;
  }

  include(count: number = 1) {
    this._length += count;
  }

  iterate(): () => Value {
    let n = this._root;
    let i = 0;
    return () => {
      if (i >= this._length) {
        return null;
      }
      ++i;
      const rv = n;
      n = n.siblings().prev();
      return rv.value();
    };
  }

  forEach(cb: (val: Value) => void) {
    let n = this._root;
    for (let i = 0; i < this._length; ++i) {
      cb(n.value());
      n = n.siblings().prev();
    }
  }
}
