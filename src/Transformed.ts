import WorldTransform from "./WorldTransform";

export default interface Transformed {
  setWorldTransform(worldMat: WorldTransform): void;
}
