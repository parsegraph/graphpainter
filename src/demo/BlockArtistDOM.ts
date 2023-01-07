import { Projector } from "parsegraph-projector";
import Method from "parsegraph-method";
import { WorldTransform, Transformed } from "parsegraph-scene";
import Artist, { NodeValues, paintNodeLines } from "parsegraph-artist";
import log from "parsegraph-log";
import { Renderable } from "parsegraph-timingbelt";
import Block from "parsegraph-block";

class BlockSceneDOM implements Renderable, Transformed {
  _projector: Projector;
  _subgroup: NodeValues<Block>;
  _world: WorldTransform;
  _onScheduleUpdate: Method;
  _elems: HTMLDivElement[];
  _lines: HTMLDivElement[];

  _sceneRoot: HTMLDivElement;

  constructor(projector: Projector, seq: NodeValues<Block>) {
    this._subgroup = seq;
    this._world = null;
    this._onScheduleUpdate = new Method();
    this._elems = [];
    this._lines = [];

    this._projector = projector;
    this._sceneRoot = null;
  }

  subgroup() {
    return this._subgroup;
  }

  projector() {
    return this._projector;
  }

  setOnScheduleUpdate(listener: () => void, listenerObj?: object) {
    this._onScheduleUpdate.set(listener, listenerObj);
  }

  markDirty() {
    this.unmount();
    this._onScheduleUpdate.call();
  }

  tick(): boolean {
    return false;
  }

  unmount(): void {
    if (this._sceneRoot) {
      this._sceneRoot.remove();
      this._sceneRoot = null;
    }
  }

  setWorldTransform(world: WorldTransform) {
    this._world = world;
  }

  sceneRoot() {
    if (
      !this._sceneRoot ||
      this._sceneRoot.parentNode !== this.projector().getDOMContainer()
    ) {
      this.unmount();
      const rootContainer = this.projector().getDOMContainer();
      this._sceneRoot = document.createElement("div");
      this._sceneRoot.style.display = "none";
      this._sceneRoot.style.position = "relative";
      this._sceneRoot.style.width = "fit-content";
      this._sceneRoot.style.height = "fit-content";

      rootContainer.appendChild(this._sceneRoot);
    }
    return this._sceneRoot;
  }

  setSeq(seq: NodeValues<Block>) {
    this._subgroup = seq;
  }

  paint() {
    let currentLine = 0;
    let currentElem = 0;
    this.subgroup().forEach((node) => {
      const block = node.value();
      const layout = block.getLayout();
      const scale = layout.groupScale();
      const borderThickness = block.borderThickness();

      log("Painting BLOCK at ({0}, {1})", layout.groupX(), layout.groupY());

      paintNodeLines(
        block.node(),
        scale*block.borderThickness(),
        (x: number, y: number, w: number, h: number) => {
          if (currentLine === this._lines.length) {
            const line = document.createElement("div");
            line.style.pointerEvents = "none";
            line.style.position = "absolute";
            this._lines.push(line);
            this.sceneRoot().appendChild(line);
          }
          const line = this._lines[currentLine++];
          if (line.parentNode !== this.sceneRoot()) {
            line.remove();
            this.sceneRoot().appendChild(line);
          }
          line.style.backgroundColor = block.blockStyle().borderColor.asRGBA();
          line.style.transform = `translate(${x - w / 2}px, ${y - h / 2}px)`;
          line.style.width = w + "px";
          line.style.height = h + "px";
        }
      );

      if (currentElem === this._elems.length) {
        const elem = document.createElement("div");
        elem.style.pointerEvents = "none";
        elem.style.position = "absolute";
        this._elems.push(elem);
        this.sceneRoot().appendChild(elem);
      }
      const elem = this._elems[currentElem++];
      if (elem.parentNode !== this.sceneRoot()) {
        elem.remove();
        this.sceneRoot().appendChild(elem);
      }
      elem.style.border =
        scale*block.borderThickness() +
        "px solid " +
        (block.focused()
          ? "#fff"
          : block
              .blockStyle()
              .borderColor.premultiply(block.blockStyle().backgroundColor)
              .asRGBA());
      elem.style.borderRadius =
        (2 + block.blockStyle().borderRoundness) * scale + "px";
      elem.style.backgroundColor = block.blockStyle().backgroundColor.asRGBA();

      const size = block.size();
      const width = scale*size.width();
      const height = scale*size.height();
      elem.style.width = width + "px";
      elem.style.height = height + "px";

      elem.style.transform = `translate(${
        layout.groupX() - width/2
      }px, ${
        layout.groupY() - height/2
      }px)`;
    });

    while (this._lines.length > currentLine) {
      this._lines.pop().remove();
    }
    while (this._elems.length > currentElem) {
      this._elems.pop().remove();
    }
    return false;
  }

  render() {
    this.sceneRoot().style.display = "block";

    const cam = this._world;
    const translate = `translate(${cam.x()}px, ${cam.y()}px)`;
    const scale = `scale(${cam.scale()})`;
    this.sceneRoot().style.transform = `${translate} ${scale}`;
    return false;
  }
}

export default class BlockArtistDOM implements Artist<Block> {
  make(projector: Projector, subgroup: NodeValues<Block>) {
    return new BlockSceneDOM(projector, subgroup);
  }

  patch(view: BlockSceneDOM, seq: NodeValues<Block>): boolean {
    view.setSeq(seq);
    return true;
  }

  static _instance: BlockArtistDOM;
  static instance() {
    if (!BlockArtistDOM._instance) {
      BlockArtistDOM._instance = new BlockArtistDOM();
    }
    return BlockArtistDOM._instance;
  }
}
