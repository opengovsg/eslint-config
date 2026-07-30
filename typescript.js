const { defineConfig } = require('eslint/config')
const tseslint = require('typescript-eslint')

const javascript = require('./javascript')

/**
 * Every TypeScript file extension the type-aware rules should cover. Unlike
 * eslintrc — where one config applied the TypeScript parser to every linted
 * file — flat config lets us scope the type-aware rules to the files that
 * actually have types, so plain JavaScript in the same project no longer has
 * to appear in a tsconfig.
 */
const TYPESCRIPT_FILES = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts']

module.exports = defineConfig([
  ...javascript,

  {
    name: 'opengovsg/typescript/resolver',
    settings: {
      'import/resolver': {
        typescript: true,
      },
    },
  },

  {
    name: 'opengovsg/typescript',
    files: TYPESCRIPT_FILES,
    extends: [
      // https://typescript-eslint.io/users/configs
      // recommends most projects to use the type-checked variant. It is a
      // strict superset of `recommended`, which is why that is not listed too —
      // the eslintrc config had to pair `recommended` with
      // `recommended-requiring-type-checking` to get the same set.
      tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        // The flat-config successor to `project: true`
        projectService: true,
      },
    },
  },
])
