import FreezerRow from "./FreezerRow";
import FrozenNodeFragment from "./FrozenNodeFragment";

let freezerSlotCount = 0;

export default class FreezerSlot {
  _id: number;
  _row: FreezerRow;
  _glTexture: WebGLTexture;
  _fragments: FrozenNodeFragment[];

  constructor(row: FreezerRow) {
    this._id = ++freezerSlotCount;
    this._row = row;
    this._glTexture = null;
    this._fragments = [];
    this.init();
  }

  projector() {
    return this._row.projector();
  }

  glTexture() {
    return this._glTexture;
  }

  gl() {
    return this._row.gl();
  }

  init() {
    const tsize = this._row.textureSize();
    const gl = this.gl();
    this._glTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      tsize,
      tsize,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    // console.log("Creating new freezer texture");
  }

  contextChanged(isLost: boolean) {
    if (!isLost) {
      this.init();
    } else {
      for (const i in this._fragments) {
        if (Object.prototype.hasOwnProperty.call(this._fragments, i)) {
          this._fragments[i].dispose();
        }
      }
      this._fragments.splice(0, this._fragments.length);
    }
  }

  addFragment(frag: FrozenNodeFragment) {
    this._fragments.push(frag);
  }

  freezer() {
    return this._row.freezer();
  }
}
