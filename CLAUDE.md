# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A published npm package (`eslint-config-opengovsg`) of shareable ESLint **flat** configs for Open Government Products, targeting ESLint 10. There is no build step — the shipped artifact is the four preset files at the repo root plus `utils/` and `.prettierrc` (see the explicit `files` allowlist in `package.json`).

Each preset exports a flat config **array**, so consumers spread it: `module.exports = [...require('eslint-config-opengovsg')]`.

## Commands

- `npm test` — 20 tests (`node:test`, no framework). Run one with `node --test --test-name-pattern "sorted imports" test/configs.test.js`.
- `npm run lint` — lints this repo using its own `javascript.js` preset via `eslint.config.js`.
- `npm ci` needs the `legacy-peer-deps=true` in `.npmrc`; see the eslint-plugin-react note below.

## How the tests work

`test/configs.test.js` lints fixtures in `test/fixtures/` through the real presets, asserting on the **rule ids reported** — so they catch upstream rule renames and plugin incompatibilities, not just config shape. The `lint()` helper passes `overrideConfigFile: true` and `ignore: false` so the repo's own `eslint.config.js` (which globally ignores the deliberately non-conforming fixtures) doesn't interfere.

Two tests are structural invariants rather than lint runs: one asserts the presets declare no rules beyond the documented exceptions, the other that every package the presets `require()` is declared in `peerDependencies` or `dependencies` — which matters now that flat config makes the presets import their plugins directly.

## Core design constraint

**Do not add self-defined rules.** The README states the package will NEVER hold its own opinions — only `recommended` rule sets from upstream plugins. Suppressing a rule that doesn't fit belongs in the consumer repo's `eslint.config.js` or upstream, not here. The exceptions are deliberate, documented inline, and pinned by a test:

- `javascript.js` — `simple-import-sort` has no preset, so its two rules are enabled manually; `prettier/prettier` is passed a resolved config object.
- `pulumi.js` — `@pulumi/eslint-plugin` ships no recommended set, so its rules plus a few Pulumi-specific `off`s are declared explicitly.

## Config layering

Presets are built with `defineConfig` from `eslint/config`, which is what makes the `extends` key inside a config object work. `javascript.js` is the base; the others compose on top:

- `typescript.js` — spreads `./javascript`, then adds `tseslint.configs.recommendedTypeChecked` **scoped to TS file extensions**. That config is a strict superset of `recommended`, which is why only one is listed. This is `main`, so `require('eslint-config-opengovsg')` resolves here.
- `react.js` — additive; pair with either base. It carries the `files` list that enrols `.jsx`/`.tsx` into linting at all, since flat config only picks up `.js`/`.mjs`/`.cjs` by default.
- `pulumi.js` — additive; combined with the TypeScript preset, whose parser its type-aware rules need.

Adding a new preset: create `<name>.js` at the root, decide whether it spreads `./javascript` or is purely additive, add its plugins to `dependencies`, add the file to the `files` allowlist, and document the usage in the README.

## Dependency categorization

Per [ESLint's shareable-config guidance](https://eslint.org/docs/latest/extend/shareable-configs), plugins and parsers belong in **`dependencies`** and only `eslint` is a `peerDependency` (declared `>=10` for future-proofing). This is a flat-config consequence: the presets `require()` their plugins directly, so they must resolve from this package rather than the consumer's tree — the opposite of the eslintrc era, where ESLint resolved plugin names from the consumer and peer dependencies were the mechanism.

`eslint-config-prettier` is in `dependencies` even though nothing here imports it, because `eslint-plugin-prettier/recommended` requires it at runtime and declares it only as an *optional* peer.

`devDependencies` holds just what the tests need beyond the above: `eslint` (to run), `react` (so the version shim resolves something real), `typescript` (for the type-aware fixtures).

Name every config object `opengovsg/<something>` — the invariant test uses that prefix to tell our own rules from inherited ones, and skips blocks named `<ours> > <theirs>` (what `defineConfig` calls things pulled in via `extends`).

## Prettier config resolution

`utils/prettier.js` `resolveConfig()` searches the consumer's cwd and ancestors for a Prettier config; only if none exists does it fall back to this package's `.prettierrc`. This exists because eslint-plugin-prettier merges rule options **over** the user's `.prettierrc` (see its `worker.mjs`), which is the opposite of what we want, so we resolve the user's config ourselves and pass it as the rule option.

Two subtleties, both load-bearing:

- Prettier 3 has no sync API, so this uses `@prettier/sync`. Flat configs are plain values, evaluated when the module is required, so the lookup has to be synchronous.
- Prettier searches upward from the *directory containing* the path it is given, so passing a bare cwd would skip the cwd's own config. Hence the extension-less `PROBE` sentinel appended to the path.

## Supported Node versions

`engines.node` is `^20.19.0 || ^22.13.0 || >=24`, copied verbatim from `eslint` and `@eslint/js` — the strictest constraint among the dependencies, and the one that actually governs whether this package is usable. Don't hand-tune it; re-copy it from `eslint` when bumping the ESLint major.

Reading the range: it excludes Node 21 and 23 specifically (both long EOL — only even majors become LTS), not odd majors as a class, since `>=24` admits 25 and 27. The oddly precise floors are the patch releases where capabilities ESLint 10 needs were backported into those LTS lines.

Caveat: Node 20 reached EOL on 2026-04-30 but is still in ESLint's range, so this package nominally supports an EOL line until ESLint drops it.

## TypeScript version ceiling

The `typescript` devDependency is `^6`, not `latest`: TypeScript 7 uses a new compiler API and `typescript-eslint` throws `does not support TS 7.0` on require (its gate is literally `versionMajor >= 7`). The caret keeps us below that boundary while allowing 6.x to float. Note 6.1+ is outside typescript-eslint's *declared* peer range of `<6.1.0` even though it works at runtime, so a 6.1 bump may surface a peer warning until upstream widens it. Track [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) before going to 7.x. TypeScript is only a devDependency here (for the type-aware fixtures) — consumers bring their own.

The `react` devDependency exists solely so `detectReactVersion()`'s resolution path is exercised; without it only the `999.999.999` fallback would ever run. The react preset test asserts the resolved version equals the installed React's, so removing this devDependency fails the suite rather than silently reducing coverage.

## eslint-plugin-react on ESLint 10

`eslint-plugin-react@7.37.5` (its newest release) crashes on ESLint 10: `settings.react.version: 'detect'` calls the removed `context.getFilename()`, which throws while *loading* every rule in the plugin. Only that code path is broken — the recommended rules themselves are fine. `utils/react.js` therefore resolves the installed React version itself and passes a concrete semver, mirroring the plugin's own `999.999.999` fallback when React isn't found.

Upstream tracking: [issue #3977](https://github.com/jsx-eslint/eslint-plugin-react/issues/3977), [PR #3979](https://github.com/jsx-eslint/eslint-plugin-react/pull/3979). When that ships, delete `utils/react.js`, restore `version: 'detect'`, and drop `.npmrc` (the plugin's peer range stopping at eslint 9.7 is why `legacy-peer-deps` is needed).

## Release

Merging to `main` publishes to npm automatically (`.github/workflows/publish.yml`, OIDC — no token), running `npm test` first, then pushing a `v<version>` tag. A PR check **fails unless the `version` field is bumped in both `package.json` and `package-lock.json`**, so every PR that changes shipped files must include a version bump.
