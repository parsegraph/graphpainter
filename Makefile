DIST_NAME = graphpainter
DEMO_PORT = 3000
DEMO_ROOT =

SCRIPT_FILES = \
	src/demo/diagonalBlockDemo.ts \
	src/demo/block2d.ts \
	src/demo/block3d.ts \
	src/demo/blockdom.ts \
	src/demo/blockrandom.ts \
	src/demo/Block.ts \
	src/demo/BlockArtist2D.ts \
	src/demo/BlockArtist3D.ts \
	src/demo/BlockArtistDOM.ts \
	src/freezer/Freezable.ts \
	src/freezer/Freezer.ts \
	src/freezer/FreezerCache.ts \
	src/freezer/FreezerRow.ts \
	src/freezer/FreezerSlice.ts \
	src/freezer/FreezerSlot.ts \
	src/freezer/FrozenNode.ts \
	src/freezer/FrozenNodeFragment.ts \
	src/graphpainter/GraphPainter.ts \
	src/graphpainter/GraphPainterAnalytics.ts \
	src/graphpainter/PaintGroup.ts \
	src/Artist.ts \
	src/index.ts \
	src/paintNodeLines.ts \
	src/NodeRenderData.ts \
	src/NodeValues.ts \
	src/Painted.ts \
	src/paintGroupBounds.ts \
	src/ProjectedCaret.ts \
	src/ProjectedNode.ts \
	src/Repaintable.ts \
	src/Transformed.ts \
	src/Viewport.ts \
	src/WorldTransform.ts

include ./Makefile.microproject
