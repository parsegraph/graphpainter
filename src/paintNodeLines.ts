import Direction, {
  isVerticalDirection,
  directionSign,
  forEachCardinalDirection,
} from "parsegraph-direction";
import { LayoutNode } from "parsegraph-layout";

export type LinePainter = (x: number, y: number, w: number, h: number) => void;

const drawLine = (
  lineThickness: number,
  painter: LinePainter,
  direction: Direction,
  node: LayoutNode
) => {
  if (node.parentDirection() == direction) {
    return;
  }
  if (!node.hasChild(direction)) {
    // Do not draw lines unless there is a node.
    return;
  }
  const directionData = node.neighborAt(direction);

  const layout = node.value().getLayout();
  const parentScale = layout.groupScale();
  const scale = directionData.getNode().value().getLayout().groupScale();
  if (typeof scale !== "number" || isNaN(scale)) {
    console.log(directionData.node);
    throw new Error(
      directionData.node + "'s groupScale must be a number but was " + scale
    );
  }

  const thickness =
    lineThickness * scale * directionData.getNode().state().scale();
  if (isVerticalDirection(direction)) {
    const length =
      directionSign(direction) *
      parentScale *
      (directionData.lineLength - node.value().size().height() / 2);
    painter(
      layout.groupX(),
      layout.groupY() +
        length / 2 +
        (parentScale *
          directionSign(direction) *
          node.value().size().height()) /
          2,
      thickness,
      Math.abs(length)
    );
  } else {
    // Horizontal line.
    const length =
      directionSign(direction) *
      parentScale *
      (directionData.lineLength - node.value().size().width() / 2);
    painter(
      layout.groupX() +
        length / 2 +
        (parentScale * directionSign(direction) * node.value().size().width()) /
          2,
      layout.groupY(),
      Math.abs(length),
      thickness
    );
  }
};

export default function paintNodeLines(
  node: LayoutNode,
  lineThickness: number,
  painter: LinePainter
) {
  forEachCardinalDirection((dir: Direction) => {
    drawLine(lineThickness, painter, dir, node);
  });
}
