const { defineConfig } = require('eslint/config')
const react = require('eslint-plugin-react')
const reactHooks = require('eslint-plugin-react-hooks')

const { detectReactVersion } = require('./utils/react')

module.exports = defineConfig([
  {
    name: 'opengovsg/react',
    // Flat config only lints `.js`, `.mjs` and `.cjs` unless a config enrols
    // more extensions, so the React preset is what brings `.jsx`/`.tsx` in.
    files: [
      '**/*.js',
      '**/*.jsx',
      '**/*.mjs',
      '**/*.cjs',
      '**/*.ts',
      '**/*.tsx',
      '**/*.mts',
      '**/*.cts',
    ],
    extends: [
      react.configs.flat.recommended,
      // We use React 17 onwards, and so we do not
      // need React to be in-scope for React components.
      // Include `jsx-runtime` to reflect this.
      // See https://github.com/jsx-eslint/eslint-plugin-react#configuration
      react.configs.flat['jsx-runtime'],
      // Note: `reactHooks.configs.recommended` is still the eslintrc-shaped
      // config; `configs.flat.recommended` is the flat one.
      reactHooks.configs.flat.recommended,
    ],
    settings: {
      react: {
        // Not `'detect'` — see utils/react.js for why
        version: detectReactVersion(),
      },
    },
  },
])
