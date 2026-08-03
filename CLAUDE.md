# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A published npm package (`@opengovsg/eslint-config`) of shareable ESLint **flat** configs, targeting ESLint 9. No build step — the shipped artifact is the four preset files at the repo root plus `prettier.config.js`, per the explicit `files` allowlist.

The package is `@opengovsg/eslint-config` but this directory may still be named `eslint-config-opengovsg`; it was renamed in v4, along with the repo move to [opengovsg/eslint-config](https://github.com/opengovsg/eslint-config). v3.0.1 was the last release under the old name.

## Commands

- `npm test` — `node:test`, no framework. One test: `node --test --test-name-pattern "sorted imports" test/configs.test.js`.
- `npm run lint` — lints this repo with its own `javascript.js` preset. Does **not** check formatting.
- `npm run format:check` / `npm run format` — Prettier, separately. CI runs the check.
- `npm ci` resolves with no peer overrides; keeping it that way is the point of the ESLint 9 pin.

## How the tests work

`test/configs.test.js` lints fixtures in `test/fixtures/` through the real presets, asserting on the **rule ids reported** — so they catch upstream rule renames and plugin incompatibilities, not just config shape. The `lint()` helper passes `overrideConfigFile: true` and `ignore: false` so this repo's own `eslint.config.js`, which globally ignores the deliberately non-conforming fixtures, doesn't interfere.

Two tests are structural invariants: one that the presets declare no rules beyond the documented exceptions, one that every package they `require()` is declared in `dependencies` or `peerDependencies`.

## Core design constraint

**Do not add self-defined rules.** The README promises this package holds no opinions of its own — only upstream `recommended` sets. Suppressing a rule that doesn't fit belongs in the consumer's `eslint.config.js` or upstream. Two deliberate exceptions, pinned by a test:

- `javascript.js` — `simple-import-sort` ships no preset, so its two rules are enabled by hand.
- `pulumi.js` — `@pulumi/eslint-plugin` enables nothing by default, so its rules plus a few Pulumi-specific `off`s are declared explicitly.

## Config layering

`defineConfig` from `eslint/config` is what makes the `extends` key inside a config object work. `javascript.js` is the base:

- `typescript.js` — spreads `./javascript`, adds `tseslint.configs.recommendedTypeChecked` scoped to TS extensions. A strict superset of `recommended`, so only one is listed. This is `main`.
- `react.js` — additive. Carries the `files` list that enrols `.jsx`/`.tsx` into linting at all, since flat config only picks up `.js`/`.mjs`/`.cjs`. That list also enrols `.ts`, which the JavaScript base cannot parse — pair this preset with the TypeScript base unless the repo is TypeScript-free. The comment in the file explains the bind.
- `pulumi.js` — additive, needs the TypeScript preset's parser. Its `files` list deliberately omits `.tsx`: the block switches two rules off, and those carve-outs must not reach React code. The near-identical lists in the two files answer different questions and should not be factored into one; a test pins the difference.

Adding a preset: create `<name>.js` at the root, add its plugins to `dependencies`, add the file to **both** the `files` allowlist and the `exports` map, and document it in the README. Omitting the `exports` entry makes it unreachable despite shipping.

## Public entry points

`exports` is the public surface: the four presets, `./prettier`, `.` aliased to `typescript.js`, and `./package.json` for tooling that reads a dependency's manifest. `main` stays as a fallback for resolvers predating `exports`, which Node ignores whenever `exports` is present.

Everything else is sealed — `/javascript.js` with the extension gets `ERR_PACKAGE_PATH_NOT_EXPORTED`. Internal _relative_ requires are unaffected; `exports` only gates resolution by package name from outside. Note that adding `exports` to a package that already has consumers is a breaking change.

## Dependency categorization

Per [ESLint's shareable-config guidance](https://eslint.org/docs/latest/extend/shareable-configs), plugins and parsers belong in **`dependencies`**, and only `eslint` is a `peerDependency` (`^9.23.0` — the floor is where `eslint/config` appeared, the ceiling is deliberate). The presets `require()` their plugins directly, so those must resolve from this package rather than the consumer's tree.

`prettier` is deliberately **not** a dependency: nothing here runs it, and shipping it would hand consumers a copy they call by name without declaring. It is a devDependency only so this repo can format itself.

`devDependencies` is otherwise just what the tests need: `eslint`, `react` (so `version: 'detect'` resolves something real when linting the JSX fixtures rather than the plugin's `999.999.999` fallback), `typescript`.

Name every config object `opengovsg/<something>` — the invariant test uses that prefix to separate our rules from inherited ones, and skips blocks named `<ours> > <theirs>`, which is what `defineConfig` calls things pulled in via `extends`.

## The import resolver

`typescript.js` sets `settings['import/resolver'] = { typescript: true }` in a block without `files`, so it also covers `.js` — JavaScript can import TypeScript. `eslint-plugin-import`'s own `flatConfigs.typescript` registers only the **node** resolver, which cannot read `paths`, so this setting and the `eslint-import-resolver-typescript` dependency are what make aliased imports resolve.

The sharp edge, verified: that resolver locates `tsconfig.json` from **`process.cwd()`** — not from the linted file, and not from ESLint's `cwd` option, which it ignores. Lint a monorepo from the root and every nested alias reports `import/no-unresolved`; the README documents the `project` glob that fixes it. Its regression test therefore runs in a child process; in-process it would assert nothing.

## Formatting is not ESLint's job

`javascript.js` pulls in `eslint-config-prettier/flat` and nothing turns formatting back on. ESLint reports problems, Prettier formats.

**`format:check` must stay in CI** — `npm run lint` cannot fail on formatting, so nothing else enforces it. `.prettierignore` mirrors the `globalIgnores` in `eslint.config.js`. Note `prettier --check .` also covers Markdown and JSON, which a lint rule never would.

Resist re-integrating the two via `eslint-plugin-prettier`. It merges rule options **over** the user's `.prettierrc` (see its `worker.mjs`), so it must resolve their config itself, synchronously, because a flat config is a plain value evaluated at require time. That pulls in `@prettier/sync`, whose peer range is a bare `prettier: "*"` — a consumer with `prettier@2` hoisted above ours satisfies it, and ESLint then dies at config-load time with no install warning to explain why.

### Shipping the style

`prettier.config.js` is both the published style (exported as `./prettier`) and the config Prettier finds when formatting this repo. It carries that name because Prettier recognises only a fixed set of config filenames, and using one means the repo formats itself with the exact object it publishes — nothing to keep in sync. Shipping a file with a discoverable config name is safe: Prettier skips `node_modules` when searching, so it never hijacks a consumer's lookup.

There is deliberately no `.prettierrc`. Prettier loads whatever a config reference resolves to _as JavaScript_, so an extension-less JSON file fails with `Unexpected token ':'` when another package points at it — on Prettier 3 too, not a version thing.

`./prettier` serves both ways a consumer can reference a shared config: a `prettier.config.js` that requires it, or the `prettier` key in package.json. The README documents the first, since [Prettier 4 drops package-name resolution](https://github.com/prettier/prettier/issues/15741) for the second.

## Supported Node versions

`engines.node` is `^18.18.0 || ^20.9.0 || >=21.1.0`, copied verbatim from `eslint` and `@eslint/js` — the strictest constraint among the dependencies. Don't hand-tune it; re-copy from `eslint` when bumping the ESLint major (10 narrows it to `^20.19.0 || ^22.13.0 || >=24`).

Node 18 and 20 are EOL but still in ESLint 9's range, so this package nominally supports EOL lines until ESLint drops them. The range is a floor, not a curated list — `>=21.1.0` admits every later major.

## TypeScript version ceiling

The `typescript` devDependency is `^6`, not `latest`: TypeScript 7 uses a new compiler API and `typescript-eslint` throws `does not support TS 7.0` on require, gating literally on `versionMajor >= 7`. The caret holds below that while letting 6.x float. Note 6.1+ is outside typescript-eslint's _declared_ peer range of `<6.1.0` even though it works, so a 6.1 bump may surface a peer warning until upstream widens it. Track [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) before going to 7.x.

## Why ESLint 9 and not 10

The load-bearing constraint of this release. Everything here _runs_ on ESLint 10, but two plugins cap their peer ranges below it:

| package                       | peer range            |
| ----------------------------- | --------------------- |
| `eslint-plugin-import@2.32.0` | `^2 \|\| … \|\| ^9`   |
| `eslint-plugin-react@7.37.5`  | `^3 \|\| … \|\| ^9.7` |

On ESLint 10 every consumer install prints `npm warn ERESOLVE overriding peer dependency`, and without `legacy-peer-deps` npm resolves a _second, nested_ ESLint 9 under those plugins. A shareable config cannot fix this for its consumers — npm `overrides` only apply from the root project — so the choice is pushing `overrides` onto every consuming repo, or staying on 9.

`eslint-plugin-react` additionally _breaks_ on ESLint 10: `version: 'detect'` calls the removed `context.getFilename()`, which throws while loading every rule in the plugin ([#3977](https://github.com/jsx-eslint/eslint-plugin-react/issues/3977), [#3979](https://github.com/jsx-eslint/eslint-plugin-react/pull/3979)).

**When #3979 ships**, the v5 checklist: bump the `eslint` peer and devDependency to `^10`, bump `@eslint/js` to `^10`, re-copy `engines.node` from `eslint`, and confirm `eslint-plugin-import` has widened its range too — or swap it for [`eslint-plugin-import-x`](https://github.com/un-ts/eslint-plugin-import-x), which already peers `^10` but renames every rule id `import/*` → `import-x/*`, breaking on its own. Verify a clean `npm ci` before shipping.

## Release

Merging to `main` publishes to npm automatically (`.github/workflows/publish.yml`, OIDC — no token), running `npm test` first, then pushing a `v<version>` tag. A PR check **fails unless `version` is bumped in both `package.json` and `package-lock.json`**, so every PR touching shipped files needs a version bump.
