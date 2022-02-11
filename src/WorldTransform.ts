import { Matrix3x3, matrixIdentity3x3 } from "parsegraph-matrix";

export default class WorldTransform {
  _world: Matrix3x3;
  _scale: number;
  _width: number;
  _height: number;
  _x: number;
  _y: number;

  constructor(
    world: Matrix3x3 = matrixIdentity3x3(),
    scale: number = 1.0,
    width: number = NaN,
    height: number = NaN,
    x: number = NaN,
    y: number = NaN
  ) {
    this._world = world;
    this._scale = scale;
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
  }

  setMatrix(world: Matrix3x3, scale: number) {
    this._world = world;
    this._scale = scale;
  }

  setOrigin(x: number, y: number) {
    this._x = x;
    this._y = y;
  }

  setSize(w: number, h: number) {
    this._width = w;
    this._height = h;
  }

  set(other: WorldTransform) {
    const otherMat = other.matrix();
    for (let i = 0; i < 9; ++i) {
      this._world[i] = otherMat[i];
    }
    this._scale = other.scale();
    this._width = other.width();
    this._height = other.height();
    this._x = other.x();
    this._y = other.y();
  }

  matrix() {
    return this._world;
  }

  scale() {
    return this._scale;
  }

  x() {
    return this._x;
  }

  y() {
    return this._y;
  }

  width() {
    return this._width;
  }

  height() {
    return this._height;
  }
}
