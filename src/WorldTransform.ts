import { Matrix3x3 } from "parsegraph-matrix";

export default class WorldTransform {
  _world: Matrix3x3;
  _scale: number;
  _width: number;
  _height: number;

  constructor(world: Matrix3x3, scale: number, width: number, height: number) {
    this._world = world;
    this._scale = scale;
    this._width = width;
    this._height = height;
  }

  matrix() {
    return this._world;
  }

  scale() {
    return this._scale;
  }

  width() {
    return this._width;
  }

  height() {
    return this._height;
  }
}
