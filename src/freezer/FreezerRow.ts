import Freezer from "./Freezer";
import { Projector } from "parsegraph-projector";
import FreezerSlot from "./FreezerSlot";
import FrozenNodeFragment from "./FrozenNodeFragment";

export const FREEZER_MARGIN = 8;

export default class FreezerRow {
  _freezer: Freezer;
  _projector: Projector;
  _colFirst: boolean;
  _slots: FreezerSlot[];
  _x: number;
  _y: number;
  _currentMax: number;

  constructor(freezer: Freezer, projector: Projector, colFirst: boolean) {
    this._freezer = freezer;
    this._projector = projector;
    this._colFirst = colFirst;
    this._slots = [];

    this._x = 0;
    this._y = 0;
    this._currentMax = 0;
  }

  gl() {
    return this._projector.glProvider().gl();
  }

  projector() {
    return this._projector;
  }

  textureSize() {
    return this.projector().textureSize();
  }

  allocate(frag: FrozenNodeFragment) {
    let lastSlot = this._slots[this._slots.length - 1];
    if (!lastSlot) {
      lastSlot = new FreezerSlot(this);
      this._slots.push(lastSlot);
    }
    const neededWidth = frag.width();
    const neededHeight = frag.height();
    const tsize = this.textureSize();
    if (neededHeight > tsize || neededHeight > tsize) {
      throw new Error(
        "Fragment size of " +
          neededWidth +
          "x" +
          neededHeight +
          " is too large for any row to allocate (tsize=" +
          tsize +
          ")"
      );
    }
    // Search for a space.
    if (this._colFirst) {
      if (this._y + neededHeight > tsize) {
        this._x += this._currentMax + FREEZER_MARGIN;
        this._y = 0;
      }
      if (this._x + neededWidth > tsize) {
        lastSlot = new FreezerSlot(this);
        this._slots.push(lastSlot);
        this._x = 0;
        this._y = 0;
        this._currentMax = 0;
      }
      // console.log("COL", lastSlot, this._x);
      frag.assignSlot(lastSlot, this._x, this._y, neededWidth, neededHeight);
      this._y += neededHeight + FREEZER_MARGIN;
      this._currentMax = Math.max(
        this._currentMax,
        neededWidth + FREEZER_MARGIN
      );
    } else {
      // Row first
      if (this._x + neededWidth > tsize) {
        this._x = 0;
        this._y += this._currentMax + FREEZER_MARGIN;
      }
      if (this._y + neededHeight > tsize) {
        lastSlot = new FreezerSlot(this);
        this._slots.push(lastSlot);
        this._x = 0;
        this._y = 0;
        this._currentMax = 0;
      }
      // console.log("ROW", lastSlot, this._x);
      frag.assignSlot(lastSlot, this._x, this._y, neededWidth, neededHeight);
      this._x += neededWidth + FREEZER_MARGIN;
      this._currentMax = Math.max(
        this._currentMax,
        neededHeight + FREEZER_MARGIN
      );
    }
  }

  contextChanged(isLost: boolean) {
    for (const i in this._slots) {
      if (Object.prototype.hasOwnProperty.call(this._slots, i)) {
        const slot = this._slots[i];
        slot.contextChanged(isLost);
      }
    }
    this._slots.splice(0, this._slots.length);
    this._x = 0;
    this._y = 0;
    this._currentMax = 0;
  }

  freezer() {
    return this._freezer;
  }
}
