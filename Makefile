DIST_NAME = graphpainter

SCRIPT_FILES = \
	src/index.ts \
	src/demo/diagonalBlockDemo.ts \
	src/demo/BlockArtist2D.ts \
	src/demo/block3d.ts \
	src/demo/blockrandom.ts \
	src/demo/blockdom.ts \
	src/demo/Viewport.ts \
	src/demo/BlockArtist3D.ts \
	src/demo/block2d.ts \
	src/demo/BlockArtistDOM.ts \
	src/glsl.d.ts \
	src/graphpainter/GraphPainterAnalytics.ts \
	src/graphpainter/PaintGroup.ts \
	src/graphpainter/GraphPainter.ts \
	src/NodeRenderData.ts \
	src/demo.ts \
	test/test.ts

EXTRA_SCRIPTS =

include ./Makefile.microproject
