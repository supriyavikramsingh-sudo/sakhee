module.exports = {
  root: false,
  extends: ['../.eslintrc.cjs'],
  env: {
    browser: true,
    node: false,
    es2021: true,
  },
  parserOptions: {
    ecmaFeatures: { jsx: true },
  },
};
