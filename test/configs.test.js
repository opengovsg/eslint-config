const { deepStrictEqual, ok, strictEqual } = require('assert')
const { execFileSync } = require('child_process')
const { mkdtempSync, readFileSync } = require('fs')
const { tmpdir } = require('os')
const { join, resolve } = require('path')
const { describe, it } = require('node:test')

const { ESLint } = require('eslint')

const ROOT = resolve(__dirname, '..')
const FIXTURES = join(__dirname, 'fixtures')

const JAVASCRIPT = require('../javascript')
const TYPESCRIPT = require('../typescript')
const REACT = require('../react')
const PULUMI = require('../pulumi')

/**
 * Lint a fixture through the given presets exactly as a consumer repo would
 * (spreading them into `eslint.config.js`), bypassing this repo's own config
 * file — which globally ignores the deliberately non-conforming fixtures.
 * @returns the rule ids reported, in order
 */
async function lint(presets, fixture) {
  const eslint = new ESLint({
    cwd: ROOT,
    overrideConfigFile: true,
    ignore: false,
    overrideConfig: presets.flat(),
  })
  const [result] = await eslint.lintFiles([join(FIXTURES, fixture)])
  return result.messages.map((message) => message.ruleId)
}

/** Run `resolveConfig()` from a given working directory. */
function resolvePrettierConfigFrom(cwd) {
  const script = `process.stdout.write(JSON.stringify(require(${JSON.stringify(
    join(ROOT, 'utils', 'prettier'),
  )}).resolveConfig()))`
  return JSON.parse(execFileSync(process.execPath, ['-e', script], { cwd }))
}

/** The packaged default, which is not requireable (no `.json` extension). */
function packagedPrettierrc() {
  return JSON.parse(readFileSync(join(ROOT, '.prettierrc'), 'utf8'))
}

describe('javascript preset', () => {
  it('applies eslint:recommended', async () => {
    const rules = await lint([JAVASCRIPT], 'js/undef.js')
    ok(rules.includes('no-undef'), `got ${rules.join(', ')}`)
  })

  it('enforces the packaged prettier style', async () => {
    const rules = await lint([JAVASCRIPT], 'js/unformatted.js')
    ok(rules.includes('prettier/prettier'), `got ${rules.join(', ')}`)
  })

  it('enforces sorted imports', async () => {
    const rules = await lint([JAVASCRIPT], 'js/unsorted-imports.js')
    ok(rules.includes('simple-import-sort/imports'), `got ${rules.join(', ')}`)
  })

  it('enforces sorted exports', async () => {
    const rules = await lint([JAVASCRIPT], 'js/unsorted-exports.js')
    ok(rules.includes('simple-import-sort/exports'), `got ${rules.join(', ')}`)
  })

  it('reports unresolvable imports', async () => {
    const rules = await lint([JAVASCRIPT], 'js/unresolved-import.js')
    ok(rules.includes('import/no-unresolved'), `got ${rules.join(', ')}`)
  })

  it('leaves conforming code alone', async () => {
    deepStrictEqual(await lint([JAVASCRIPT], 'js/clean.js'), [])
  })
})

describe('typescript preset', () => {
  it('applies the typescript-eslint recommended set', async () => {
    const rules = await lint([TYPESCRIPT], 'ts/explicit-any.ts')
    ok(
      rules.includes('@typescript-eslint/no-explicit-any'),
      `got ${rules.join(', ')}`,
    )
  })

  it('applies type-aware rules, proving parserOptions.project resolves', async () => {
    const rules = await lint([TYPESCRIPT], 'ts/floating-promise.ts')
    ok(
      rules.includes('@typescript-eslint/no-floating-promises'),
      `got ${rules.join(', ')}`,
    )
  })

  it('still inherits the javascript base', async () => {
    const rules = await lint([TYPESCRIPT], 'ts/unsorted-imports.ts')
    ok(rules.includes('simple-import-sort/imports'), `got ${rules.join(', ')}`)
  })

  it('leaves conforming typescript alone', async () => {
    deepStrictEqual(await lint([TYPESCRIPT], 'ts/clean.ts'), [])
  })
})

describe('react preset', () => {
  it('applies the react recommended set', async () => {
    const rules = await lint([JAVASCRIPT, REACT], 'react/missing-key.jsx')
    ok(rules.includes('react/jsx-key'), `got ${rules.join(', ')}`)
  })

  it('does not require React to be in scope (jsx-runtime)', async () => {
    const rules = await lint([JAVASCRIPT, REACT], 'react/no-react-import.jsx')
    ok(!rules.includes('react/react-in-jsx-scope'), `got ${rules.join(', ')}`)
  })

  it('applies the react-hooks recommended set', async () => {
    const rules = await lint([JAVASCRIPT, REACT], 'react/conditional-hook.jsx')
    ok(rules.includes('react-hooks/rules-of-hooks'), `got ${rules.join(', ')}`)
  })

  it('is additive, and pins a concrete React version', () => {
    // It has to compose on top of either base preset, so it must not fight
    // them over the parser.
    ok(REACT.every((block) => !block.languageOptions?.parser))
    // `version: 'detect'` crashes every rule in the plugin on ESLint 10, so we
    // resolve the version ourselves — see utils/react.js. Asserting against the
    // React actually installed here covers the resolution path; a silent fall
    // back to `999.999.999` would fail this.
    const { version } = REACT.at(-1).settings.react
    strictEqual(version, require('react/package.json').version)
  })
})

describe('pulumi preset', () => {
  it('flags an Output inside a template literal', async () => {
    const rules = await lint([TYPESCRIPT, PULUMI], 'ts/pulumi-output.ts')
    ok(
      rules.includes('@pulumi/no-output-in-template-literal'),
      `got ${rules.join(', ')}`,
    )
  })

  it('turns off the rules that clash with Pulumi idioms', async () => {
    const base = await lint([TYPESCRIPT], 'ts/pulumi-allowances.ts')
    deepStrictEqual(base.sort(), [
      '@typescript-eslint/no-empty-object-type',
      '@typescript-eslint/no-unused-vars',
    ])
    const withPulumi = await lint(
      [TYPESCRIPT, PULUMI],
      'ts/pulumi-allowances.ts',
    )
    deepStrictEqual(withPulumi, [])
  })
})

describe('prettier config resolution', () => {
  it("prefers the consumer's own prettier config", () => {
    const config = resolvePrettierConfigFrom(join(FIXTURES, 'custom-prettier'))
    strictEqual(config.printWidth, 40)
    strictEqual(config.semi, true)
  })

  it('falls back to the packaged .prettierrc', () => {
    const config = resolvePrettierConfigFrom(
      mkdtempSync(join(tmpdir(), 'ogp-')),
    )
    deepStrictEqual(config, packagedPrettierrc())
  })
})

/** Rules declared by this package itself, rather than inherited upstream. */
function ownRules(preset) {
  return (
    preset
      // `defineConfig` names blocks pulled in via `extends` "<ours> > <theirs>"
      .filter(
        (block) =>
          block.name?.startsWith('opengovsg/') && !block.name.includes(' > '),
      )
      .flatMap((block) => Object.keys(block.rules ?? {}))
      .sort()
  )
}

describe('package invariants', () => {
  it('declares no rules beyond the documented exceptions', () => {
    // The README forbids self-defined opinions: every rule declared here must
    // be either a plugin with no `recommended` preset, or a documented Pulumi
    // carve-out.
    deepStrictEqual(ownRules(JAVASCRIPT), [
      'prettier/prettier',
      'simple-import-sort/exports',
      'simple-import-sort/imports',
    ])
    deepStrictEqual(ownRules(TYPESCRIPT), ownRules(JAVASCRIPT))
    deepStrictEqual(ownRules(REACT), [])
    deepStrictEqual(ownRules(PULUMI), [
      '@pulumi/no-output-in-template-literal',
      '@pulumi/no-output-instance-in-template-literal',
      '@typescript-eslint/no-empty-object-type',
      '@typescript-eslint/no-unused-vars',
    ])
  })

  it('declares every package the presets require', () => {
    // Flat config means the presets `require()` their plugins directly, so
    // anything they import has to be resolvable from a consumer's install.
    const { dependencies = {}, peerDependencies } = require('../package.json')
    const sources = [
      'javascript',
      'typescript',
      'react',
      'pulumi',
      'utils/prettier',
      'utils/react',
    ]
    for (const source of sources) {
      const code = readFileSync(join(ROOT, `${source}.js`), 'utf8')
      for (const [, specifier] of code.matchAll(/require\('([^']+)'\)/g)) {
        if (specifier.startsWith('.') || specifier === 'path') continue
        // Strip any subpath, e.g. eslint-plugin-prettier/recommended
        const pkg = specifier.startsWith('@')
          ? specifier.split('/').slice(0, 2).join('/')
          : specifier.split('/')[0]
        ok(
          pkg in peerDependencies || pkg in dependencies,
          `${source}.js requires ${pkg}, which is in neither peerDependencies nor dependencies`,
        )
      }
    }
  })
})
