const { deepStrictEqual, ok, strictEqual } = require('assert')
const { execFileSync } = require('child_process')
const { readFileSync } = require('fs')
const { isBuiltin } = require('module')
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

describe('javascript preset', () => {
  it('applies eslint:recommended', async () => {
    const rules = await lint([JAVASCRIPT], 'js/undef.js')
    ok(rules.includes('no-undef'), `got ${rules.join(', ')}`)
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

  it('resolves imports through tsconfig path aliases', () => {
    // The only thing `settings['import/resolver'].typescript` and the
    // eslint-import-resolver-typescript dependency buy us: eslint-plugin-import
    // ships only the node resolver, which cannot see `paths`.
    //
    // A child process because that resolver reads `process.cwd()` — not the
    // linted file, and not ESLint's `cwd` option, which it ignores. In-process
    // this would assert nothing. See the README on monorepos.
    const script = `
      const { ESLint } = require(${JSON.stringify(require.resolve('eslint'))})
      new ESLint({
        overrideConfigFile: true,
        ignore: false,
        overrideConfig: require(${JSON.stringify(join(ROOT, 'typescript'))}),
      })
        .lintFiles(['tsconfig-path-import.ts'])
        .then(([result]) =>
          process.stdout.write(
            JSON.stringify(result.messages.map((m) => m.ruleId)),
          ),
        )`
    const reported = execFileSync(process.execPath, ['-e', script], {
      cwd: join(FIXTURES, 'ts'),
      encoding: 'utf8',
    })
    deepStrictEqual(JSON.parse(reported), [])
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

  it('is additive', () => {
    // It has to compose on top of either base preset, so it must not fight
    // them over the parser.
    ok(REACT.every((block) => !block.languageOptions?.parser))
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

  it('leaves .tsx alone, so its carve-outs cannot reach React code', async () => {
    // The preset switches two rules off, so scoping it to non-JSX TypeScript is
    // what stops `no-unused-vars` going quiet across a repo's components.
    const rules = await lint([TYPESCRIPT, PULUMI], 'ts/pulumi-scope.tsx')
    ok(rules.includes('@typescript-eslint/no-unused-vars'), `got ${rules}`)
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

describe('prettier interop', () => {
  it('does not run prettier as a lint rule', async () => {
    // Formatting is `prettier --check`'s job, so an unformatted file is not a
    // lint failure.
    deepStrictEqual(await lint([JAVASCRIPT], 'js/unformatted.js'), [])
  })

  it('turns off the core rules that conflict with a formatter', () => {
    // What eslint-config-prettier buys us: without it, `--fix` fights
    // `--write`.
    const off = JAVASCRIPT.filter((block) => block.name === 'config-prettier')
      .flatMap((block) => Object.entries(block.rules ?? {}))
      .filter(([, level]) => level === 'off' || level === 0)
    ok(off.length > 100, `only ${off.length} rules disabled`)
    ok(off.some(([rule]) => rule === 'no-mixed-spaces-and-tabs'))
  })

  it('publishes the style it formats this repo with', () => {
    // One file serves both roles, so they cannot drift. This asserts the
    // subpath consumers require still resolves to it.
    const { exports: map } = require('../package.json')
    strictEqual(map['./prettier'], './prettier.config.js')
    deepStrictEqual(require('../prettier.config.js'), {
      printWidth: 80,
      semi: false,
      singleQuote: true,
      trailingComma: 'all',
    })
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
    // The README forbids self-defined opinions, so anything declared here must
    // be a plugin with no preset of its own, or a documented Pulumi carve-out.
    deepStrictEqual(ownRules(JAVASCRIPT), [
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
    // The presets `require()` their plugins directly, so anything they import
    // has to resolve from a consumer's install.
    const { dependencies = {}, peerDependencies } = require('../package.json')
    const sources = [
      'javascript',
      'typescript',
      'react',
      'pulumi',
      'prettier.config',
    ]
    for (const source of sources) {
      const code = readFileSync(join(ROOT, `${source}.js`), 'utf8')
      for (const [, specifier] of code.matchAll(/require\('([^']+)'\)/g)) {
        if (specifier.startsWith('.') || isBuiltin(specifier)) continue
        // Strip any subpath, e.g. eslint-config-prettier/flat
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
