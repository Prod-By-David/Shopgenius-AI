/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ["@remix-run/eslint-config", "@remix-run/eslint-config/node"],
  ignorePatterns: ["build/", "node_modules/", "prisma/", "tests/"],
  rules: {
    "react/no-danger": "off",
  },
};