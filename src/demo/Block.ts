import ProjectedNode from "../ProjectedNode";
import Artist from "../Artist";
import { Interactive, Interaction } from "parsegraph-interact";
import Freezable from "../freezer/Freezable";
import Painted from "../Painted";
import { Layout } from "parsegraph-layout";
import FreezerCache from "../freezer/FreezerCache";
import Color from "parsegraph-color";
import Size from "parsegraph-size";
import Direction from "parsegraph-direction";
import Repaintable from "../Repaintable";

export const BUD_RADIUS = 2;
export const LINE_COLOR = new Color(0.8, 0.8, 0.8, 0.6);
export const SELECTED_LINE_COLOR = new Color(0.8, 0.8, 0.8, 1);
export const LINE_THICKNESS = (12 * BUD_RADIUS) / 8;

export default class Block implements Interactive, Painted<Block>, Freezable {
  _layout: Layout;
  _interactor: Interaction;
  _node: ProjectedNode<Block>;
  _cache: FreezerCache;
  _color: Color;
  _borderColor: Color;
  _focused: boolean;
  _artist: Artist<Block>;
  _onUpdate: Repaintable;

  constructor(
    color: Color,
    borderColor: Color,
    node: ProjectedNode<Block>,
    artist: Artist<Block>
  ) {
    this._node = node;
    this._artist = artist;
    this._focused = false;
    this._interactor = new Interaction();
    this._interactor.setFocusListener(this.onFocus, this);
    this._layout = new Layout(node);
    this._cache = new FreezerCache(node);
    this._color = color;
    this._borderColor = borderColor;

    this._onUpdate = null;
  }

  color() {
    return this._color;
  }

  borderColor() {
    return this._borderColor;
  }

  lineColor() {
    return LINE_COLOR;
  }

  borderRoundness() {
    return 10;
  }

  borderThickness() {
    return 5;
  }

  focused() {
    return this._focused;
  }

  scheduleRepaint() {
    if (this._onUpdate) {
      // console.log("Scheduling REPAINT");
      this._onUpdate.scheduleRepaint();
    }
  }

  onFocus(focus: boolean): boolean {
    // console.log("FOCUSED");
    this._focused = focus;
    this.scheduleRepaint();
    return true;
  }

  getSeparation() {
    return 10;
  }

  size(size?: Size): Size {
    if (!size) {
      size = new Size();
    }
    size.setWidth(100);
    size.setHeight(100);
    if (this.node().hasNode(Direction.INWARD)) {
      const innerSize = this.node()
        .nodeAt(Direction.INWARD)
        .value()
        .getLayout()
        .extentSize();
      size.setWidth(
        Math.max(size.width(), this.getSeparation() * 2 + innerSize.width())
      );
      size.setHeight(
        Math.max(size.width(), this.getSeparation() * 2 + innerSize.height())
      );
    }
    return size;
  }

  artist(): Artist<Block> {
    return this._artist;
  }

  node(): ProjectedNode {
    return this._node;
  }

  getCache() {
    return this._cache;
  }

  getLayout(): Layout {
    return this._layout;
  }

  interact(): Interaction {
    return this._interactor;
  }

  setOnScheduleUpdate(repaintable: Repaintable) {
    this._onUpdate = repaintable;
  }
}
