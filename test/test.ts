import { assert } from "chai";
import {GraphPainter} from "../dist/parsegraph-graphpainter.lib";
import Camera from "parsegraph-camera";
import {DirectionNode} from "parsegraph-direction";

describe("Package", function () {
  it("works", () => {
    const node = new DirectionNode();
    const cam = new Camera();
    assert.ok(new GraphPainter(node, cam));
  });
});