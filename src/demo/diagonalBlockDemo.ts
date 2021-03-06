import Color from "parsegraph-color";

import Artist, { PaintedNode } from "parsegraph-artist";

import TimingBelt from "parsegraph-timingbelt";
import { Projection, BasicProjector, Projector } from "parsegraph-projector";
import Direction, { DirectionNode } from "parsegraph-direction";

import Viewport from "../Viewport";
import Block, { style } from "parsegraph-block";
import { Renderable } from "parsegraph-timingbelt";
import Method from "parsegraph-method";

// import Freezer from "../freezer/Freezer";

class DebugOverlay implements Renderable {
  _onUpdate: Method;
  _projector: Projector;

  constructor() {
    this._projector = new BasicProjector();
    this._onUpdate = new Method();

    this.container().style.pointerEvents = "none";
    this.container().style.position = "absolute";
    this.container().style.top = "0px";
    this.container().style.left = "0px";
  }

  container() {
    return this.projector().glProvider().container();
  }

  tick() {
    return false;
  }

  projector() {
    return this._projector;
  }

  paint() {
    this.projector().overlay();
    return false;
  }

  width() {
    return this.projector().width();
  }

  height() {
    return this.projector().height();
  }

  render() {
    this.projector().render();
    const ctx = this.projector().overlay();
    ctx.clearRect(0, 0, this.width(), this.height());
    ctx.fillStyle = "white";
    ctx.textBaseline = "top";
    ctx.fillText("DebugOverlay", 0, 0);
    ctx.fillStyle = "red";
    ctx.textAlign = "right";
    ctx.fillText("DebugOverlay", this.width(), 0);
    ctx.fillStyle = "blue";
    ctx.textBaseline = "bottom";
    ctx.fillText("DebugOverlay", this.width(), this.height());
    ctx.fillStyle = "yellow";
    ctx.textAlign = "left";
    ctx.fillText("DebugOverlay", 0, this.height());
    return false;
  }

  unmount() {}

  setOnScheduleUpdate(listener: () => void, listenerObj?: object) {
    this._onUpdate.set(listener, listenerObj);
  }
}

const diagonalBlockDemo = (artistFunc: () => Artist<Block>) => {
  const makeBlock = (color: Color, borderColor: Color) => {
    const node: DirectionNode<Block> = new DirectionNode();
    const artist = artistFunc();
    const blockStyle = style("b");
    blockStyle.backgroundcolor = color;
    blockStyle.borderColor = borderColor;
    const b = new Block(node, blockStyle, artist);
    if (comp) {
      b.setOnScheduleUpdate(() => comp.scheduleUpdate());
    }
    node.setValue(b);
    return node;
  };

  const belt = new TimingBelt();

  const root = makeBlock(new Color(1, 1, 1), new Color(0.5, 0.5, 0.5, 0.5));
  const comp = new Viewport(root);
  root.value().setOnScheduleUpdate(() => comp.scheduleUpdate());
  // const freezer = new Freezer();
  // root.value().getCache().freeze(freezer);

  let n: PaintedNode = root;
  for (let i = 0; i < 10; ++i) {
    const child = makeBlock(
      new Color(1 - i / 10, 0, 0),
      new Color(0.5, 0.5, 0.5, 0.5)
    );
    n.connectNode(i % 2 ? Direction.FORWARD : Direction.DOWNWARD, child);
    n = child;
    if (i == 5) {
      n.crease();
    }
  }

  window.addEventListener("resize", () => {
    belt.scheduleUpdate();
  });

  const topElem = document.getElementById("demo");

  const projector = new BasicProjector();
  topElem.appendChild(projector.container());
  projector.container().style.position = "absolute";
  const proj = new Projection(projector, comp);
  belt.addRenderable(proj);
  const debugOverlay = new DebugOverlay();
  topElem.appendChild(debugOverlay.container());
  debugOverlay.container().style.position = "absolute";
  belt.addRenderable(debugOverlay);
};

export default diagonalBlockDemo;
