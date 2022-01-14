import Freezer from "./Freezer";
import { Projector } from "parsegraph-projector";
import FreezerRow from "./FreezerRow";
import FrozenNodeFragment from "./FrozenNodeFragment";
import FreezerSlot from "./FreezerSlot";
import { Matrix3x3 } from "parsegraph-matrix";
import { compileProgram } from "parsegraph-compileprogram";
import freezerVertexShader from "./Freezer_VertexShader.glsl";
import freezerFragmentShader from "./Freezer_FragmentShader.glsl";

export default class FreezerWindow {
  _freezer: Freezer;
  _projector: Projector;
  _gl: WebGLRenderingContext;
  _shaders: { [id: string]: WebGLProgram };
  _highAspectRow: FreezerRow;
  _lowAspectRow: FreezerRow;
  _program: WebGLProgram;
  uWorld: WebGLUniformLocation;
  uTexture: WebGLUniformLocation;
  aPosition: number;
  aTexCoord: number;
  _origFramebuffer: WebGLFramebuffer;
  _origRenderbuffer: WebGLRenderbuffer;
  _framebuffer: WebGLFramebuffer;
  _activated: boolean;
  _renderbuffer: WebGLRenderbuffer;

  constructor(freezer: Freezer, projector: Projector) {
    this._freezer = freezer;
    this._projector = projector;
    this._gl = projector.glProvider().gl();
    this._shaders = projector.glProvider().shaders();
    this._highAspectRow = new FreezerRow(freezer, projector, true);
    this._lowAspectRow = new FreezerRow(freezer, projector, false);
  }

  allocate(width: number, height: number): FrozenNodeFragment {
    const frag = new FrozenNodeFragment(width, height);
    const aspect = width / height;
    if (aspect < 1 / 4) {
      this._lowAspectRow.allocate(frag);
    } else {
      this._highAspectRow.allocate(frag);
    }
    return frag;
  }

  contextChanged(isLost: boolean) {
    console.log("Freezer context lost is " + isLost);
  }

  renderFragment(
    frag: FrozenNodeFragment,
    world: Matrix3x3,
    needsSetup: boolean,
    needsLoad: boolean
  ) {
    const gl = this.gl();
    if (needsSetup) {
      if (!this._program) {
        this._program = compileProgram(
          this._projector.glProvider(),
          "Freezer",
          freezerVertexShader,
          freezerFragmentShader
        );
        this.uWorld = gl.getUniformLocation(this._program, "u_world");
        this.uTexture = gl.getUniformLocation(this._program, "u_texture");
        this.aPosition = gl.getAttribLocation(this._program, "a_position");
        this.aTexCoord = gl.getAttribLocation(this._program, "a_texCoord");
      }
      gl.useProgram(this._program);

      gl.activeTexture(gl.TEXTURE0);
      // console.log("Using texture " + frag.slot()._id);
      gl.enableVertexAttribArray(this.aPosition);
      gl.enableVertexAttribArray(this.aTexCoord);
    }
    gl.bindTexture(gl.TEXTURE_2D, frag.slot().glTexture());
    gl.uniform1i(this.uTexture, 0);
    if (needsLoad || needsSetup) {
      gl.uniformMatrix3fv(this.uWorld, false, world);
    }

    const FLOAT_SIZE = 4;
    const stride = 4 * FLOAT_SIZE;
    gl.bindBuffer(gl.ARRAY_BUFFER, frag.vertexBuffer());
    gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(
      this.aTexCoord,
      2,
      gl.FLOAT,
      false,
      stride,
      2 * FLOAT_SIZE
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    // gl.disableVertexAttribArray(this.a_position);
    // gl.disableVertexAttribArray(this.a_texCoord);
    /* if((err = gl.getError()) != gl.NO_ERROR && err != gl.CONTEXT_LOST_WEBGL) {
          throw new Error("GL error during cached rendering");
      }*/
  }

  textureSize() {
    return this._projector.textureSize();
  }

  activate(slot: FreezerSlot) {
    const gl = this._gl;
    this._origFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    this._origRenderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING);
    this._activated = true;

    if (!this._framebuffer) {
      this._framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);

      this._renderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
      const tsize = this.textureSize();
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        gl.DEPTH_COMPONENT16,
        tsize,
        tsize
      );
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        this._renderbuffer
      );
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
    }
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      slot.glTexture(),
      0
    );
  }

  deactivate() {
    if (!this._activated) {
      return;
    }
    const gl = this._gl;
    this._activated = false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._origFramebuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this._origRenderbuffer);
  }

  gl() {
    return this._gl;
  }
}
