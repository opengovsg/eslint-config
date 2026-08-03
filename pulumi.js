const { defineConfig } = require('eslint/config')

const pulumi = require('@pulumi/eslint-plugin')

// These rules are type-aware, so spread `@opengovsg/eslint-config` first — this
// preset relies on the parser and `projectService` that one sets up.
//
// No `.tsx`, unlike the TypeScript preset: Pulumi programs carry no JSX, and
// the block below switches two rules off. Matching `.tsx` would disable
// `no-unused-vars` across the React components of any repo holding an app and
// its infrastructure together.
const PULUMI_FILES = ['**/*.ts', '**/*.mts', '**/*.cts']

module.exports = defineConfig([
  {
    name: 'opengovsg/pulumi',
    files: PULUMI_FILES,
    plugins: { '@pulumi': pulumi },
    // The one place this package declares rules of its own — see the README —
    // and only because `@pulumi/eslint-plugin` enables nothing by default. If
    // it ever ships a recommended set, delete this and extend that instead.
    rules: {
      '@pulumi/no-output-in-template-literal': 'error',
      '@pulumi/no-output-instance-in-template-literal': 'error',
      // Generated `XxxArgs` types are idiomatically empty interfaces. The rule
      // is `no-empty-object-type` because typescript-eslint v8 folded the older
      // `no-empty-interface` into it.
      '@typescript-eslint/no-empty-object-type': 'off',
      // `new Resource('xxx')` is written for its side effect, the binding kept
      // only to name the resource.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])
