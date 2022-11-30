module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    commonjs: true,
    es2020: true,
  },
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  rules: {},
};
