const { defineConfig } = require('eslint/config')
const tseslint = require('typescript-eslint')

const javascript = require('./javascript')

/**
 * Type-aware rules error on any file their `tsconfig` does not include, so
 * scoping them to files that actually have types is what keeps a project's
 * plain JavaScript out of its `tsconfig`.
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
      // A strict superset of `recommended`, which is therefore not listed too.
      // https://typescript-eslint.io/users/configs
      tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
])
