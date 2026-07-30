# eslint-config-opengovsg

## Goal

The goal of this package is to **provide reasonable defaults for most common scenarios, so that developers can start building** without worrying about linting configurations.

## Explanation

ESLint is a tool to "find and fix problems in your JavaScript code" (from [https://eslint.org/](https://eslint.org/)). We use ESLint to help us write better code. However, we do not want to invest efforts into the fine-tuning of detailed configurations, as those efforts can be better invested into building other things.

As a result, we will NEVER have self-defined opinions in the library, which means `rules` section should not exist in the configs. Instead, only `recommended` rule sets from the biggest linting libraries (e.g. `eslint:recommended`) will be used. Essentially:

1. We fully trust the community out there to maintain a reasonable set of recommended rules, so that most common error-prone patterns are covered
1. When something really does not make sense in `recommended`, there are 2 options:
   - influence and change the upstream `recommended` rule set
   - or do overrides in `eslint.config.js` in our own repositories, NOT here. If a rule does not make sense to the broader community thus cannot enter the `recommended` rule set, it would not make sense to be here either.

## Usage

To install:

```sh
npm install --save-dev eslint eslint-config-opengovsg
```

Every plugin the presets use is a dependency of this package, so that is the whole install — ESLint itself is the only peer dependency. (`install-peerdeps` was needed in v3 and no longer is.)

Every preset is a [flat config](https://eslint.org/docs/latest/use/configure/configuration-files) array, so spread it into your `eslint.config.js`. Depending on the usage:

```js
// TypeScript (yep we use TypeScript by default in OGP)
module.exports = [...require('eslint-config-opengovsg')]

// React
module.exports = [
  ...require('eslint-config-opengovsg'),
  ...require('eslint-config-opengovsg/react'),
]

// Pulumi
module.exports = [
  ...require('eslint-config-opengovsg'),
  ...require('eslint-config-opengovsg/pulumi'),
]

// JavaScript, in case you really do not need TypeScript
module.exports = [...require('eslint-config-opengovsg/javascript')]
```

The React preset is additive, so pair it with either base — `eslint-config-opengovsg` or `eslint-config-opengovsg/javascript`.

## Upgrading from v3

v4 requires ESLint 10 and drops `.eslintrc` support, because [ESLint 10 removed it](https://eslint.org/docs/latest/use/migrate-to-10.0.0). To migrate:

1. Replace `.eslintrc` with an `eslint.config.js` as above, moving any repository-specific overrides into a config object appended after the presets.
2. Replace `.eslintignore` with `globalIgnores([...])` from `eslint/config`.
3. The type-aware rules now only apply to `.ts`/`.tsx`/`.mts`/`.cts` files, so plain JavaScript in a TypeScript project no longer has to be listed in a `tsconfig.json`.
4. Prettier 3 is now required, which changes some default formatting. Run `eslint --fix` over the repository once.
5. Remove the plugins `install-peerdeps` added to your `devDependencies` — see below.

### Removing the v3 peer dependencies

v3 required you to install all eleven peers yourself, which is what `npx install-peerdeps --dev` did. v4 ships them as its own dependencies, so those entries in your `package.json` are now redundant — and stale, since they pin the v3 major of each plugin. Delete them:

```sh
npm uninstall \
  @pulumi/eslint-plugin \
  @typescript-eslint/eslint-plugin \
  eslint-config-prettier \
  eslint-import-resolver-typescript \
  eslint-plugin-import \
  eslint-plugin-prettier \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-simple-import-sort
```

Then upgrade the one peer that remains:

```sh
npm install --save-dev eslint@^10 eslint-config-opengovsg@^4
```

Three things to keep rather than remove:

- **`prettier`**, if you invoke it directly — a `format` script, `lint-staged`, a pre-commit hook, or an editor integration. It stays in `node_modules` as our dependency, but a package you call by name should be one you declare. Upgrade it to `^3` rather than dropping it. If ESLint is the only thing that ever runs Prettier in your repo, uninstall it.
- **`eslint`** itself, which is still the peer dependency.
- **Any plugin your own config references directly.** `@typescript-eslint/*` and `react/*` rule names in your overrides keep working, because the presets register those plugins for you — but if your `eslint.config.js` `require()`s a plugin itself, it has to be your own dependency. Do not rely on resolving one of ours transitively; that breaks the moment we change a preset.

Removing `eslint-plugin-react` in particular also clears the `ERESOLVE` install error described below, since the conflict only errors when the plugin is a direct dependency of your repo.

### Known issue: the React preset and ESLint 10

[`eslint-plugin-react` does not support ESLint 10 yet](https://github.com/jsx-eslint/eslint-plugin-react/issues/3977) — a fix is [in progress upstream](https://github.com/jsx-eslint/eslint-plugin-react/pull/3979). Its recommended rules work fine; only its `version: 'detect'` handling is broken, so this package resolves your installed React version itself (see `utils/react.js`) and the preset works today.

The plugin's declared peer range still stops at ESLint 9.7, so `npm install` prints `npm warn ERESOLVE overriding peer dependency` — a warning, not an error, since the plugin comes in as our dependency rather than yours. You only need `--legacy-peer-deps` if you also depend on `eslint-plugin-react` directly. Both workarounds go away once upstream publishes.
