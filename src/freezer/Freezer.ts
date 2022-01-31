import Camera from "parsegraph-camera";

import { Projector } from "parsegraph-projector";

import ProjectedNode from "../ProjectedNode";

import FrozenNode from "./FrozenNode";
import FreezerSlice from "./FreezerSlice";
import FreezerRow from "./FreezerRow";

// The maximum scale where nodes will be rendered from a cache.
export const FREEZER_TEXTURE_SCALE = 1;

export default class Freezer {
  _frozenNodes: FrozenNode[];
  _textureScale: number;
  _camera: Camera;
  _slices: Map<Projector, FreezerSlice>;
  _framebuffer: WebGLFramebuffer;
  _renderbuffer: WebGLRenderbuffer;
  _activated: boolean;
  _lowAspectRow: FreezerRow;
  _highAspectRow: FreezerRow;
  _program: WebGLProgram;

  constructor() {
    this._frozenNodes = [];
    this._textureScale = FREEZER_TEXTURE_SCALE;

    this._slices = new Map();

    this._camera = new Camera();

    this._framebuffer = null;
    this._renderbuffer = null;
    this._activated = false;
  }

  sliceFor(projector: Projector) {
    return this._slices.get(projector);
  }

  cache(node: ProjectedNode) {
    const item = new FrozenNode(this, node);
    this._frozenNodes.push(item);
    return item;
  }

  contextChanged(isLost: boolean) {
    this._slices.forEach((slice) => {
      slice.contextChanged(isLost);
    });
    this._lowAspectRow.contextChanged(isLost);
    this._highAspectRow.contextChanged(isLost);
    if (isLost) {
      this._activated = false;
      this._framebuffer = null;
      this._renderbuffer = null;
      this._program = null;
    }
  }

  allocate(projector: Projector, width: number, height: number) {
    if (!this._slices.has(projector)) {
      this._slices.set(projector, new FreezerSlice(this, projector));
    }
    return this._slices.get(projector).allocate(width, height);
  }

  camera() {
    return this._camera;
  }

  textureScale() {
    return this._textureScale;
  }
}
