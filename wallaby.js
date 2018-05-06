module.exports = function(wallaby) {
  return {
    files: ["/**/*.js", "!__tests__/*.js", "!node_modules/**"],

    tests: ["__tests__/*.js"],

    env: {
      type: "node",
      runner: "node"
    },

    compilers: {
      "**/*.js": wallaby.compilers.babel()
    },

    testFramework: "jest"
  };
};
