import { DirectionNode } from "parsegraph-direction";
import { Interactive } from "parsegraph-interact";
import Freezable from "./freezer/Freezable";
import Painted from "./Painted";
import { Projected } from "parsegraph-projector";

export type ProjectedNodeValue<T extends Projected> = Painted<T> & Interactive & Freezable;

type ProjectedNode<T extends Projected = Projected> = DirectionNode<
  ProjectedNodeValue<T>
>;
export default ProjectedNode;
