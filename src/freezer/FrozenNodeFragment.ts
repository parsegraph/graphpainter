import FrozenNode from "./FrozenNode";
import FreezerSlot from "./FreezerSlot";
import { Matrix3x3 } from "parsegraph-matrix";
import NodeRenderData from "../NodeRenderData";
import PaintGroup from "../graphpainter/PaintGroup";
import log, { logEnter, logLeave } from "parsegraph-log";

export default class FrozenNodeFragment {
  _width: number;
  _height: number;
  _x: number;
  _y: number;
  _frozenNode: FrozenNode;
  _slot: FreezerSlot;
  _textureX: number;
  _textureY: number;
  _textureWidth: number;
  _textureHeight: number;
  _vertexBuffer: WebGLBuffer;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._x = NaN;
    this._y = NaN;
    this._frozenNode = null;
    this._slot = null;
    this._textureX = NaN;
    this._textureY = NaN;
    this._vertexBuffer = null;
  }

  assignNode(frozenNode: FrozenNode, x: number, y: number) {
    this._frozenNode = frozenNode;
    this._x = x;
    this._y = y;
  }

  assignSlot(
    slot: FreezerSlot,
    textureX: number,
    textureY: number,
    textureWidth: number,
    textureHeight: number
  ) {
    this._slot = slot;
    this._slot.addFragment(this);
    this._textureX = textureX;
    this._textureY = textureY;
    this._textureWidth = textureWidth;
    this._textureHeight = textureHeight;
  }

  vertexBuffer() {
    return this._vertexBuffer;
  }

  projector() {
    return this._slot.projector();
  }

  windowData() {
    return this.freezer().sliceFor(this.projector());
  }

  gl() {
    return this._slot.gl();
  }

  paint(paintGroup: PaintGroup) {
    if (this._vertexBuffer) {
      return;
    }
    if (!this._slot) {
      throw new Error(
        "Fragment must be assigned a slot in order for it to be painted"
      );
    }

    log("Painting frozen node fragment");
    const freezer = this.freezer();
    const wdata = this.freezer().sliceFor(this.projector());
    try {
      const gl = wdata.gl();
      gl.bindTexture(gl.TEXTURE_2D, this._slot.glTexture());
      gl.generateMipmap(gl.TEXTURE_2D);
      wdata.activate(this._slot);
      const cam = freezer.camera();
      cam.setSize(this._width, this._height);
      const scale = freezer.textureScale();
      cam.setScale(scale);
      cam.setOrigin(-this._x / scale, -this._y / scale);
      // console.log(
      //   "Viewport=",
      //   this._textureX,
      //   this._textureY,
      //   this._textureWidth,
      //   this._textureHeight);
      gl.viewport(
        this._textureX,
        this._textureY,
        this._textureWidth,
        this._textureHeight
      );
      const tsize = wdata.textureSize();
      const world = cam.project();
      logEnter("Painting frozen node fragment");
      log("Cam origin", cam.x(), cam.y(), cam.scale());
      log("Cam size", cam.width(), cam.height());
      log("Scale", scale);
      paintGroup.renderDirect(world, scale, false, cam);
      logLeave();

      if (!this._vertexBuffer) {
        this._vertexBuffer = gl.createBuffer();
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);

      const arr = new Float32Array(6 * 4);
      arr[0] = this._x;
      arr[1] = this._y + this._height;
      arr[2] = this._textureX / tsize;
      arr[3] = this._textureY / tsize;
      // arr[2] = 0;
      // arr[3] = 0;

      arr[4] = this._x + this._width;
      arr[5] = this._y + this._height;
      arr[6] = (this._textureX + this._textureWidth) / tsize;
      arr[7] = this._textureY / tsize;
      // arr[6] = 1;
      // arr[7] = 0;

      arr[8] = this._x + this._width;
      arr[9] = this._y;
      arr[10] = (this._textureX + this._textureWidth) / tsize;
      arr[11] = (this._textureY + this._textureHeight) / tsize;
      // arr[10] = 1;
      // arr[11] = 1;

      arr[12] = arr[0];
      arr[13] = arr[1];
      arr[14] = arr[2];
      arr[15] = arr[3];

      arr[16] = arr[8];
      arr[17] = arr[9];
      arr[18] = arr[10];
      arr[19] = arr[11];

      arr[20] = arr[0];
      arr[21] = arr[9];
      arr[22] = arr[2];
      arr[23] = arr[11];
      // console.log(arr);
      for (let i = 0; i < 6; ++i) {
        arr[4 * i] /= scale;
        arr[4 * i + 1] /= scale;
      }

      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    } finally {
      wdata.deactivate();
    }
  }

  render(
    world: Matrix3x3,
    _: NodeRenderData,
    needsSetup: boolean,
    needsLoad: boolean
  ) {
    log("Rendering fragment");
    if (!this._vertexBuffer) {
      return false;
    }
    this.windowData().renderFragment(this, world, needsSetup, needsLoad);
    return true;
  }

  dispose() {
    if (this._vertexBuffer) {
      const gl = this.gl();
      if (!gl.isContextLost()) {
        console.log("Disposing of vertex buffer");
        gl.deleteBuffer(this._vertexBuffer);
      }
      this._vertexBuffer = null;
    }
    this._slot = null;
    this._textureX = NaN;
    this._textureY = NaN;
    this._textureWidth = NaN;
    this._textureHeight = NaN;
  }

  width() {
    return this._width;
  }

  height() {
    return this._height;
  }

  slot() {
    return this._slot;
  }

  freezer() {
    if (!this._slot) {
      throw new Error("This fragment has not been assigned a slot");
    }
    return this._slot.freezer();
  }
}
