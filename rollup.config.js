import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "./src/index.js",
  output: {
    file: "./dist/index.js",
    format: "cjs",
  },
  plugins: [commonjs()],
  // Tell Rollup not to bundle dependencies listed in package.json
  external: [...Object.keys(require("./package.json").dependencies || {})],
};
