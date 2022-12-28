module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    commonjs: true,
    es2020: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
    },
  },

  rules: {},
}
