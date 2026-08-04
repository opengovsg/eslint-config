# @opengovsg/eslint-config

Shareable ESLint configs for Open Government Products, so you can start building without tuning linter settings.

**This package will never hold its own opinions.** It only composes `recommended` rule sets from upstream plugins — we trust those communities to cover the error-prone patterns. If a rule does not fit, change it upstream or override it in your own `eslint.config.js`, not here. A rule that cannot earn its place in an upstream `recommended` set does not belong here either.

## Usage

```sh
npm install --save-dev eslint@^9 prettier@^3 @opengovsg/eslint-config
```

The same version is published to GitHub Packages as well. To install from there instead, point the scope at that registry in your `.npmrc` and authenticate with a token that has `read:packages`:

```ini
@opengovsg:registry=https://npm.pkg.github.com
```

Every ESLint plugin the presets use is a dependency of this package, so you never install those yourself — ESLint is the only peer dependency. Prettier is separate, because ESLint does not run it: you invoke it directly, so you declare it. Skip it if you do not want formatting.

Each preset is a [flat config](https://eslint.org/docs/latest/use/configure/configuration-files) array, so spread it into your `eslint.config.js`:

```js
// TypeScript (the OGP default)
module.exports = [...require('@opengovsg/eslint-config')]

// React
module.exports = [
  ...require('@opengovsg/eslint-config'),
  ...require('@opengovsg/eslint-config/react'),
]

// Pulumi
module.exports = [
  ...require('@opengovsg/eslint-config'),
  ...require('@opengovsg/eslint-config/pulumi'),
]

// JavaScript, if you really do not need TypeScript
module.exports = [...require('@opengovsg/eslint-config/javascript')]
```

`.`, `/javascript`, `/typescript`, `/react`, `/pulumi` and `/prettier` are the whole public surface; `.` is an alias for `/typescript`. Anything else will not resolve.

**Pair React with the TypeScript base** unless your repo has no TypeScript at all. That preset enrols `.ts`/`.tsx` into linting — it must, or `react-hooks` misses custom hooks written in `.ts` — and the JavaScript base has no TypeScript parser. Combined with `/javascript`, a single `.d.ts` (the usual declaration for SVG or CSS-module imports) is enough to produce `Parsing error: Unexpected token`.

## Formatting

**ESLint does not format your code.** The presets include `eslint-config-prettier`, which switches off every rule that would fight a formatter, but Prettier runs as its own command — as both Prettier and `eslint-plugin-prettier` recommend. Add:

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

Then create a `prettier.config.js` re-exporting our style, optionally overriding it:

```js
module.exports = require('@opengovsg/eslint-config/prettier')

// or
module.exports = {
  ...require('@opengovsg/eslint-config/prettier'),
  printWidth: 100,
}
```

Run `format:check` in CI, and `npx prettier --write .` once when adopting.

> Prettier also accepts `"prettier": "@opengovsg/eslint-config/prettier"` in `package.json`, which works today. Prefer the config file: Prettier 4 [drops package-name resolution](https://github.com/prettier/prettier/issues/15741), while requiring the config is plain module resolution.

### Monorepos and `tsconfig` path aliases

`eslint-import-resolver-typescript` finds your `tsconfig.json` **relative to the directory ESLint runs in**, not relative to the file being linted. Run ESLint from the directory holding the `tsconfig.json` and aliases resolve with no configuration.

Lint a monorepo from the root and nested aliases report `import/no-unresolved`. Point the resolver at them — we ship no default glob, as it would have to guess your layout:

```js
module.exports = [
  ...require('@opengovsg/eslint-config'),
  {
    settings: {
      'import/resolver': {
        typescript: { project: ['tsconfig.json', 'packages/*/tsconfig.json'] },
      },
    },
  },
]
```

## Which ESLint version

v4 requires **ESLint 9** (`^9.23.0`, where `defineConfig` landed).

ESLint 10 is deliberately unsupported: `eslint-plugin-import` and `eslint-plugin-react` still cap their peer ranges at 9, so installing on 10 means a wall of `ERESOLVE` warnings and, without `--legacy-peer-deps`, a second nested copy of ESLint. We stay on 9 rather than push that onto every consumer. Tracked at [eslint-plugin-react#3979](https://github.com/jsx-eslint/eslint-plugin-react/pull/3979); ESLint 10 lands in v5.

## Upgrading from v3

The package is renamed from `eslint-config-opengovsg` to `@opengovsg/eslint-config`, and the presets are now flat configs.

1. Swap the package and drop the plugins with it. v3 made you install eleven peers yourself; v4 ships them as its own dependencies, so those entries are redundant and pin stale majors. Check [what not to uninstall](#what-not-to-uninstall) first.

   ```sh
   npm uninstall \
     eslint-config-opengovsg \
     @pulumi/eslint-plugin \
     @typescript-eslint/eslint-plugin \
     eslint-config-prettier \
     eslint-import-resolver-typescript \
     eslint-plugin-import \
     eslint-plugin-prettier \
     eslint-plugin-react \
     eslint-plugin-react-hooks \
     eslint-plugin-simple-import-sort

   npm install --save-dev eslint@^9 prettier@^3 @opengovsg/eslint-config
   ```

   **Run these as two commands, in this order.** Installing first fails outright: v3 declares `eslint: ^8.0.0` as a peer, which npm cannot reconcile with `^9.23.0`, so you get an `ERESOLVE` error rather than an upgrade. Drop `prettier@^3` only if you want no formatting.

2. Replace `.eslintrc` with an `eslint.config.js` as above, moving repository-specific overrides into a config object appended after the presets.
3. Replace `.eslintignore` with `globalIgnores([...])` from `eslint/config`.
4. Type-aware rules now apply only to `.ts`/`.tsx`/`.mts`/`.cts`, so plain JavaScript no longer has to appear in a `tsconfig.json`.
5. Set formatting up as its own step — see [Formatting](#formatting). Without it your code simply stops being formatted.
6. Prettier 3 formats differently from the Prettier 2 v3 used. Run `npx prettier --write .` once, as its own commit.

### What not to uninstall

- **`prettier`** — no longer shipped for you. Step 1 moves it to `^3`.
- **`eslint`** — still the peer dependency. Step 1 moves it to `^9`.
- **Any plugin your own config references directly.** `@typescript-eslint/*` and `react/*` rule names in your overrides keep working, since the presets register those plugins. But if your `eslint.config.js` `require()`s a plugin itself, declare it yourself — resolving one of ours transitively breaks the moment we change a preset.
