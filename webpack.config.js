const {webpackConfig, relDir} = require("./webpack.common");

module.exports = {
  externals: {
    "parsegraph-log":{
      commonjs:"parsegraph-log",
      commonjs2:"parsegraph-log",
      amd:"parsegraph-log",
      root:"parsegraph_log"
    },
    "parsegraph-checkglerror":{
      commonjs:"parsegraph-checkglerror",
      commonjs2:"parsegraph-checkglerror",
      amd:"parsegraph-checkglerror",
      root:"parsegraph_checkglerror"
    }
  },
  entry: {
    lib: relDir("src/index.ts"),
    block2d: relDir("src/demo/block2d.ts"),
    block3d: relDir("src/demo/block3d.ts"),
    blockdom: relDir("src/demo/blockdom.ts"),
    blockrandom: relDir("src/demo/blockrandom.ts"),
  },
  ...webpackConfig(false)
};
