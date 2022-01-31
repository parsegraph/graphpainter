import Freezer from "./Freezer";
import paintGroupBounds from "../paintGroupBounds";
import ProjectedNode from "../ProjectedNode";
import FrozenNodeFragment from "./FrozenNodeFragment";
import { Projector } from "parsegraph-projector";
import { Matrix3x3 } from "parsegraph-matrix";
import NodeRenderData from "../NodeRenderData";
import PaintGroup from "../graphpainter/PaintGroup";
import log from "parsegraph-log";

export default class FrozenNode {
  _node: ProjectedNode;
  _freezer: Freezer;
  _windowFragments: Map<Projector, FrozenNodeFragment[]>;
  _validated: boolean;
  _x: number;
  _y: number;
  _width: number;
  _height: number;

  constructor(freezer: Freezer, node: ProjectedNode) {
    this._node = node;
    this._freezer = freezer;
    this._windowFragments = new Map();
    this.invalidate();
  }

  invalidate() {
    log("Invalidating frozen node for " + this._node);
    this._windowFragments.forEach((fragments) => {
      fragments.forEach((frag) => {
        frag.dispose();
      });
      fragments.splice(0, fragments.length);
    });
    this._validated = false;
    this._width = NaN;
    this._height = NaN;
    this._x = NaN;
    this._y = NaN;
  }

  validate() {
    if (this._validated) {
      return;
    }
    const bounds = paintGroupBounds(this.node());
    this._width = bounds.left + bounds.right;
    this._height = bounds.top + bounds.bottom;
    this._x = bounds.left;
    this._y = bounds.top;

    this._validated = true;
  }

  paint(paintGroup: PaintGroup, projector: Projector) {
    log("Painting frozen node");
    this.validate();
    if (!this._windowFragments.has(projector)) {
      this._windowFragments.set(projector, []);
    }
    const fragments = this._windowFragments.get(projector);

    if (fragments.length === 0) {
      log("Allocating frozen node");
      const scale = this._freezer.textureScale();
      const fragWidth = this._width * scale;
      const fragHeight = this._height * scale;
      const fragX = this._x * scale;
      const fragY = this._y * scale;
      const textureSize = projector.textureSize();
      const fragSize = textureSize * scale;
      const numRows = Math.ceil(fragHeight / textureSize);
      const numCols = Math.ceil(fragWidth / textureSize);
      for (let y = 0; y < numRows; ++y) {
        for (let x = 0; x < numCols; ++x) {
          const frag = this._freezer.allocate(
            projector,
            Math.min(fragWidth - textureSize * x, textureSize),
            Math.min(fragHeight - textureSize * y, textureSize)
          );
          frag.assignNode(
            this,
            (x * fragSize) / this._freezer.textureScale() - fragX,
            (y * fragSize) / this._freezer.textureScale() - fragY
          );
          fragments.push(frag);
        }
      }
    }
    for (const i in fragments) {
      if (Object.prototype.hasOwnProperty.call(fragments, i)) {
        fragments[i].paint(paintGroup);
      }
    }
  }

  render(
    projector: Projector,
    world: Matrix3x3,
    renderData: NodeRenderData,
    needsSetup: boolean
  ) {
    log("Frozen render");
    if (!this._validated) {
      return false;
    }
    if (!this._windowFragments.has(projector)) {
      return false;
    }
    const fragments = this._windowFragments.get(projector);
    let renderedClean = true;
    let needsLoad = true;
    for (const i in fragments) {
      if (!fragments[i].render(world, renderData, needsSetup, needsLoad)) {
        renderedClean = false;
      } else {
        needsLoad = false;
        needsSetup = false;
      }
    }
    return renderedClean;
  }

  node() {
    return this._node;
  }
}
