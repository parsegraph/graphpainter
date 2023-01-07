DIST_NAME = graphpainter

SCRIPT_FILES = \
	src/GraphPainterAnalytics.ts \
	src/index.ts \
	src/PaintGroup.ts \
	src/demo/diagonalBlockDemo.ts \
	src/demo/BlockArtist2D.ts \
	src/demo/block3d.ts \
	src/demo/blockrandom.ts \
	src/demo/blockdom.ts \
	src/demo/BlockArtist3D.ts \
	src/demo/block2d.ts \
	src/demo/BlockArtistDOM.ts \
	src/GraphPainter.ts \
	src/glsl.d.ts \
	src/Viewport.ts \
	src/NodeRenderData.ts \
	src/demo.ts \
	test/test.ts

EXTRA_SCRIPTS =

include ./Makefile.microproject
