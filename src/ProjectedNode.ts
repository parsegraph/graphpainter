import { DirectionNode } from "parsegraph-direction";
import { Interactive } from "parsegraph-interact";
import Freezable from "./freezer/Freezable";
import Painted from "./Painted";
import { WorldRenderable } from "./Artist";

export type ProjectedNodeValue<
  Model = {},
  View extends WorldRenderable = WorldRenderable
> = Painted<Model, View> & Interactive & Freezable;

type ProjectedNode<
  Model = {},
  View extends WorldRenderable = WorldRenderable
> = DirectionNode<ProjectedNodeValue<Model, View>>;

export default ProjectedNode;
