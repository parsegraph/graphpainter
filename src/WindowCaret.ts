import Direction, {
  DirectionNode,
  DirectionCaret,
  readDirection,
} from "parsegraph-direction";
import Painted from "./Painted";
import Freezable from "./freezer/Freezable";
import Freezer from "./freezer/Freezer";
import {
  Interactive,
  EventListener,
  FocusListener,
  KeyListener,
} from "parsegraph-interact";

export default class WindowCaret<
  Value extends Painted & Interactive & Freezable
> extends DirectionCaret<Value> {
  _freezer: Freezer;

  clone(): WindowCaret<Value> {
    const car = new WindowCaret<Value>(this.node(), this.palette());
    car.setFreezer(this._freezer);
    return car;
  }

  onClick(clickListener: EventListener, thisArg?: object): void {
    this.node().value().interact().setClickListener(clickListener, thisArg);
  }

  onKey(keyListener: KeyListener, thisArg?: object): void {
    this.node().value().interact().setKeyListener(keyListener, thisArg);
  }

  onFocus(focusListener: FocusListener, thisArg?: object): void {
    this.node().value().interact().setFocusListener(focusListener, thisArg);
  }

  setFreezer(freezer: Freezer): void {
    this._freezer = freezer;
  }

  freeze(inDirection?: Direction | string): void {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);
    let node: DirectionNode<Value>;
    if (arguments.length === 0) {
      node = this.node();
    } else {
      node = this.node().nodeAt(inDirection);
    }
    if (!this._freezer) {
      throw new Error("Caret must have a freezer in order to freeze nodes");
    }
    node.value().getCache().freeze(this._freezer);
  }

  thaw(inDirection?: Direction | string): void {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);
    let node: DirectionNode<Value>;
    if (arguments.length === 0) {
      node = this.node();
    } else {
      node = this.node().nodeAt(inDirection);
    }
    node.value().getCache().thaw();
  }
}
