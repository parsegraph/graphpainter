import { matrixIdentity3x3, Matrix3x3 } from "parsegraph-matrix";
import Rect from "parsegraph-rect";

export default class NodeRenderData {
  bounds: Rect;
  scaleMat: Matrix3x3;
  transMat: Matrix3x3;
  worldMat: Matrix3x3;

  constructor() {
    this.bounds = new Rect(0, 0, 0, 0);
    this.scaleMat = matrixIdentity3x3();
    this.transMat = matrixIdentity3x3();
    this.worldMat = matrixIdentity3x3();
  }
}
