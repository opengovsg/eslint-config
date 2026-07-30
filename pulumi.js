const { defineConfig } = require('eslint/config')
const tseslint = require('typescript-eslint')

const pulumi = require('@pulumi/eslint-plugin')

// The Pulumi rules are type-aware, so they only apply where the TypeScript
// preset has set the parser up. This preset is always combined with
// `opengovsg` — see the README.
const TYPESCRIPT_FILES = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts']

module.exports = defineConfig([
  {
    name: 'opengovsg/pulumi',
    files: TYPESCRIPT_FILES,
    plugins: {
      '@pulumi': pulumi,
      // Re-registering the same plugin object under the same name is a no-op,
      // and keeps the `@typescript-eslint/*` overrides below resolvable.
      '@typescript-eslint': tseslint.plugin,
    },
    // Pulumi does not have a recommended rule set, otherwise this portion should never exist
    rules: {
      // Apply Pulumi's ESLint rules since nothing is enabled by default
      '@pulumi/no-output-in-template-literal': 'error',
      '@pulumi/no-output-instance-in-template-literal': 'error',
      // Some XxxArgs definitions are written as empty interfaces.
      // typescript-eslint v8 folded `no-empty-interface` into
      // `no-empty-object-type`.
      '@typescript-eslint/no-empty-object-type': 'off',
      // Sometimes `const xxx = new Resource('xxx')` makes the code more readable, despite not using `xxx` afterwards
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])
