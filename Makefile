DIST_NAME = graphpainter

SCRIPT_FILES =  \
	src/Painted.ts \
	src/index.ts \
	src/paintNodeLines.ts \
	src/Transformed.ts \
	src/Artist.ts \
	src/demo/diagonalBlockDemo.ts \
	src/demo/BlockArtist2D.ts \
	src/demo/block3d.ts \
	src/demo/Block.ts \
	src/demo/blockrandom.ts \
	src/demo/blockdom.ts \
	src/demo/BlockArtist3D.ts \
	src/demo/block2d.ts \
	src/demo/BlockArtistDOM.ts \
	src/ProjectedCaret.ts \
	src/paintGroupBounds.ts \
	src/glsl.d.ts \
	src/graphpainter/GraphPainterAnalytics.ts \
	src/graphpainter/PaintGroup.ts \
	src/graphpainter/GraphPainter.ts \
	src/Viewport.ts \
	src/freezer/FreezerCache.ts \
	src/freezer/Freezable.ts \
	src/freezer/Freezer.ts \
	src/freezer/FrozenNode.ts \
	src/freezer/FrozenNodeFragment.ts \
	src/freezer/FreezerSlot.ts \
	src/freezer/FreezerRow.ts \
	src/freezer/FreezerSlice.ts \
	src/NodeValues.ts \
	src/WorldTransform.ts \
	src/Repaintable.ts \
	src/NodeRenderData.ts \
	src/ProjectedNode.ts \
	src/demo.ts \
	test/test.ts

EXTRA_SCRIPTS =  \
	src/freezer/Freezer_VertexShader.glsl \
	src/freezer/Freezer_FragmentShader.glsl

include ./Makefile.microproject
