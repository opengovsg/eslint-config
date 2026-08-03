const { defineConfig } = require('eslint/config')
const react = require('eslint-plugin-react')
const reactHooks = require('eslint-plugin-react-hooks')

module.exports = defineConfig([
  {
    name: 'opengovsg/react',
    // Flat config lints only `.js`, `.mjs` and `.cjs` by default, so this list
    // is what enrols `.jsx`/`.tsx` at all.
    //
    // The TypeScript entries are load-bearing but cut both ways. Drop `**/*.ts`
    // and `react-hooks` misses custom hooks, where most of them live. Keep it
    // and — since one `files` list both scopes rules and enrols extensions —
    // ESLint is asked to parse `.ts` even under the JavaScript base, which has
    // no TypeScript parser. Pairing this with that base in a repo holding any
    // TypeScript, down to a lone `.d.ts`, is a parse error. Separating the two
    // would take a second preset; the README says which base to pair with.
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
      // React 17+ needs no React import in scope for JSX; this stops
      // `react-in-jsx-scope` demanding one.
      react.configs.flat['jsx-runtime'],
      // `configs.flat.recommended`, not `configs.recommended` — the latter is
      // this plugin's eslintrc-shaped config and silently does nothing here.
      reactHooks.configs.flat.recommended,
    ],
    settings: {
      react: {
        // Detection calls `context.getFilename()`, which ESLint 10 removes —
        // every rule in the plugin then throws as it loads. Before raising the
        // supported ESLint range, confirm jsx-eslint/eslint-plugin-react#3979
        // has shipped, or pass a concrete semver here.
        version: 'detect',
      },
    },
  },
])
