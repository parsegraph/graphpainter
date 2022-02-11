const path = require("path");

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
    lib: path.resolve(__dirname, "src/index.ts"),
    block2d: path.resolve(__dirname, "src/demo/block2d.ts"),
    block3d: path.resolve(__dirname, "src/demo/block3d.ts"),
    blockdom: path.resolve(__dirname, "src/demo/blockdom.ts"),
    blockrandom: path.resolve(__dirname, "src/demo/blockrandom.ts"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "parsegraph-graphpainter.[name].js",
    globalObject: "this",
    library: "parsegraph_graphpainter",
    libraryTarget: "umd",
  },
  module: {
    rules: [
      {
        test: /\.(js|ts|tsx?)$/,
        exclude: /node_modules/,
        use: ["babel-loader", "ts-loader"]
      },
      {
        test: /\.(glsl|vs|fs|vert|frag)$/,
        exclude: /node_modules/,
        use: ["ts-shader-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".glsl"],
    modules: [path.resolve(__dirname, "src"), "node_modules"],
  },
  mode: "development",
  devtool: "eval-source-map",
};
