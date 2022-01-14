import Painted from "./Painted";
import { DirectionNode } from "parsegraph-direction";
import { Interactive } from "parsegraph-interact";
import Freezable from "./freezer/Freezable";

export type WindowNode = DirectionNode<Painted & Interactive & Freezable>;
export default WindowNode;
