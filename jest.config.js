module.exports = {
  transform: {
    "\\.[jt]sx?$": "babel-jest",
    '\\.glsl$': '<rootDir>/glslTransformer.js',
  },
};
