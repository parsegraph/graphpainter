import Color from "parsegraph-color";

import Artist, { PaintedNode } from "parsegraph-artist";

import TimingBelt from "parsegraph-timingbelt";
import { Projection, BasicProjector, Projector } from "parsegraph-projector";
import Direction, { DirectionNode } from "parsegraph-direction";

import Viewport from "../Viewport";
import Block, { style } from "parsegraph-block";
import { Renderable } from "parsegraph-timingbelt";
import Method from "parsegraph-method";
import { showInCamera } from "parsegraph-showincamera";

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

  const rootNode = makeBlock(new Color(1, 1, 1), new Color(0.5, 0.5, 0.5, 0.5));
  const comp = new Viewport(rootNode);
  rootNode.value().setOnScheduleUpdate(() => comp.scheduleUpdate());
  // const freezer = new Freezer();
  // root.value().getCache().freeze(freezer);

  let n: PaintedNode = rootNode;
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
  debugOverlay.container().style.pointerEvents = "none";
  belt.addRenderable(debugOverlay);
  setTimeout(()=>{
    showInCamera(comp.root(), comp.camera(), false);
  }, 0);


  const root = projector.container();
  root.tabIndex = 0;
  let clicked = false;
  root.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      clicked = true;
    }
  });
  root.addEventListener("mousemove", (e) => {
    if (!clicked) {
      return;
    }
    const cam = comp.camera();
    cam.adjustOrigin(e.movementX / cam.scale(), e.movementY / cam.scale());
    comp.scheduleRepaint();
    belt.scheduleUpdate();
  });
  root.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      clicked = false;
    }
  });
  root.addEventListener("wheel", (e) => {
    const zoomIn = (e as WheelEvent).deltaY < 0;
    console.log(e);
    comp.camera().zoomToPoint(zoomIn ? 1.1 : 0.9, e.clientX, e.clientY);
    comp.scheduleRepaint();
    belt.scheduleUpdate();
  });
};

export default diagonalBlockDemo;
