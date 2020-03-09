module.exports = {
  root: true,
  env: {
    node: true,
    mocha: true
  },
  plugins: [
    "chai-friendly"
  ],
  extends: [
    "airbnb-typescript/base",
    "plugin:chai-expect/recommended",
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'linebreak-style': process.env.NODE_ENV === 'production' ? ['error', 'windows'] : ['off', 'windows'],
    "@typescript-eslint/no-unused-expressions": 0,
    "chai-friendly/no-unused-expressions": 2
  },
  parserOptions: {
    project: './tsconfig.json',
  },
};
