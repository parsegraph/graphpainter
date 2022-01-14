DIST_NAME = graphpainter

SCRIPT_FILES = \
	src/demo/block.ts \
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
	src/graphpainter/GraphPainterSlice.ts \
	src/graphpainter/PaintGroup.ts \
	src/graphpainter/PaintSubgroup.ts \
	src/demo/block.ts \
	src/index.ts \
	src/Artist.ts \
	src/NodeRenderData.ts \
	src/PaintContext.ts \
	src/Painted.ts \
	src/paintGroupBounds.ts \
	src/WindowCaret.ts \
	src/WindowNode.ts

all: build lint test coverage esdoc

build: dist/parsegraph-$(DIST_NAME).js
.PHONY: build

build-prod: dist-prod/parsegraph-$(DIST_NAME).js
.PHONY: build-prod

demo: dist/parsegraph-$(DIST_NAME).js
	npm run demo
.PHONY: demo

check:
	npm run test
.PHONY: check

test: check
.PHONY: test

coverage:
	npm run coverage
.PHONY: coverage

prettier:
	npx prettier --write src test demo
.PHONY: prettier

lint:
	npx eslint --fix $(SCRIPT_FILES)
.PHONY: lint

esdoc:
	npx esdoc
.PHONY: esdoc

doc: esdoc
.PHONY: doc

tar: parsegraph-$(DIST_NAME)-dev.tgz
.PHONY: tar

tar-prod: parsegraph-$(DIST_NAME)-prod.tgz
.PHONY: tar

parsegraph-$(DIST_NAME)-prod.tgz: dist-prod/parsegraph-$(DIST_NAME).js
	rm -rf parsegraph-$(DIST_NAME)
	mkdir parsegraph-$(DIST_NAME)
	cp -r README.md LICENSE parsegraph-$(DIST_NAME)
	cp -r dist-prod/ parsegraph-$(DIST_NAME)/dist
	cp -r package-prod.json parsegraph-$(DIST_NAME)/package.json
	tar cvzf $@ parsegraph-$(DIST_NAME)/
	rm -rf parsegraph-$(DIST_NAME)

parsegraph-$(DIST_NAME)-dev.tgz: dist/parsegraph-$(DIST_NAME).js
	rm -rf parsegraph-$(DIST_NAME)
	mkdir parsegraph-$(DIST_NAME)
	cp -r -t parsegraph-$(DIST_NAME) package.json package-lock.json README.md demo/ LICENSE dist/
	tar cvzf $@ parsegraph-$(DIST_NAME)/
	rm -rf parsegraph-$(DIST_NAME)

dist/parsegraph-$(DIST_NAME).js: package.json package-lock.json $(SCRIPT_FILES) $(GLSL_SCRIPTS)
	npm run build
	test ! -e dist-types/src/demo || (mkdir -p dist/demo && mv -v dist-types/src/demo/* dist/demo)
	rm -rf dist-types/src/demo
	test ! -e dist-types/src/freezer || (mkdir -p dist/freezer && mv -v dist-types/src/freezer/* dist/freezer)
	rm -rf dist-types/src/freezer
	test ! -e dist-types/src/graphpainter || (mkdir -p dist/graphpainter && mv -v dist-types/src/graphpainter/* dist/graphpainter)
	rm -rf dist-types/src/graphpainter
	mv -v dist-types/src/* dist/
	mv dist/index.d.ts dist/parsegraph-$(DIST_NAME).d.ts
	mv dist/index.d.ts.map dist/parsegraph-$(DIST_NAME).d.ts.map

dist-prod/parsegraph-$(DIST_NAME).js: package.json package-lock.json $(SCRIPT_FILES)
	npm run build-prod
	mv -v dist-types/src/* dist-prod/
	mv dist-prod/index.d.ts dist-prod/parsegraph-$(DIST_NAME).d.ts
	mv dist-prod/index.d.ts.map dist-prod/parsegraph-$(DIST_NAME).d.ts.map

clean:
	rm -rf dist dist-types dist-prod .nyc_output parsegraph-$(DIST_NAME) parsegraph-$(DIST_NAME)-dev.tgz parsegraph-$(DIST_NAME)-prod.tgz
.PHONY: clean
