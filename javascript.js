const js = require('@eslint/js')
const configPrettier = require('eslint-config-prettier/flat')
const { defineConfig } = require('eslint/config')
const importPlugin = require('eslint-plugin-import')
const simpleImportSort = require('eslint-plugin-simple-import-sort')
const globals = require('globals')

/**
 * The base every other preset builds on. Its blocks are unscoped, so they apply
 * to TypeScript too once `typescript.js` enrols those extensions.
 */
module.exports = defineConfig([
  js.configs.recommended,

  // `typescript` is not optional alongside `recommended`: without it the
  // resolver cannot follow `.ts` or type-only imports and reports working code
  // as unresolved.
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,

  // Subtractions only — it disables rules that fight a formatter, and ESLint
  // never runs Prettier. Keep it last so those `off`s win.
  configPrettier,

  {
    name: 'opengovsg/javascript',
    // Must come after the configs above, which declare their own.
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // Flat config has no `env` key. Deliberately broad — one preset serves
      // browser, Node and test code, and a missing set reads as `no-undef`.
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
      // Not our opinion — the plugin ships no preset, so these are its
      // documented defaults:
      // https://github.com/lydell/eslint-plugin-simple-import-sort#usage
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
    },
  },
])
