// eslint-plugin-react's own `version: 'detect'` resolves the React version
// from the file being linted, via `context.getFilename()` — which ESLint 10
// removed, so every rule in the plugin throws on load. See
// https://github.com/jsx-eslint/eslint-plugin-react/issues/3977 and the fix in
// https://github.com/jsx-eslint/eslint-plugin-react/pull/3979.
//
// Until that ships, we resolve the version ourselves and hand the plugin a
// concrete semver, which avoids the broken code path entirely. Revert to
// `version: 'detect'` once eslint-plugin-react supports ESLint 10.

// The same value eslint-plugin-react falls back to when it cannot find React —
// see ULTIMATE_LATEST_SEMVER in its lib/util/version.js
const ASSUME_LATEST = '999.999.999'

/**
 * Resolve the React version installed alongside the project being linted.
 * Unlike the plugin's own detection this looks from the working directory
 * rather than from each linted file, so a monorepo with differing React
 * versions per package resolves the root one.
 * @returns a semver string, or `999.999.999` if React cannot be found
 */
function detectReactVersion() {
  try {
    return require(
      require.resolve('react/package.json', { paths: [process.cwd()] }),
    ).version
  } catch {
    return ASSUME_LATEST
  }
}

module.exports = { detectReactVersion }
