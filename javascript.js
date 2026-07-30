const js = require('@eslint/js')
const { defineConfig } = require('eslint/config')
const importPlugin = require('eslint-plugin-import')
const prettierRecommended = require('eslint-plugin-prettier/recommended')
const simpleImportSort = require('eslint-plugin-simple-import-sort')
const globals = require('globals')

const { resolveConfig } = require('./utils/prettier')

/**
 * Base JavaScript config does 2 things:
 * - Apply basic recommended rule sets
 * - Fix imports
 */
module.exports = defineConfig([
  // `eslint:recommended` in eslintrc
  js.configs.recommended,

  // `plugin:import/recommended` and `plugin:import/typescript` in eslintrc
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,

  // `plugin:prettier/recommended` in eslintrc: turns off every rule that
  // conflicts with Prettier, and reports formatting via prettier/prettier
  prettierRecommended,

  {
    name: 'opengovsg/javascript',
    // The recommended configs above declare their own `languageOptions`, so
    // ours has to come after them to win.
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // Flat config has no `env`, so the equivalent global sets are spread in
      // by hand. These mirror the eslintrc envs this config used to declare.
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.es2022,
        ...globals.jest,
        ...globals.node,
      },
    },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      // simple-import-sort does not have a preset. Below is the default from
      // https://github.com/lydell/eslint-plugin-simple-import-sort#usage
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
      'prettier/prettier': ['error', resolveConfig()],
    },
  },
])
