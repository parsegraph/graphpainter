const {webpackConfig, relDir} = require("./webpack.common");

module.exports = {
  entry: {
    index: relDir("src/index.ts"),
    block2d: relDir("src/demo/block2d.ts"),
    block3d: relDir("src/demo/block3d.ts"),
    blockdom: relDir("src/demo/blockdom.ts"),
    blockrandom: relDir("src/demo/blockrandom.ts"),
    demo: relDir("src/demo.ts"),
  },
  ...webpackConfig(false),
};
