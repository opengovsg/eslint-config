// Prettier 3 dropped its synchronous API. `@prettier/sync` is the official
// synchronous wrapper, and we need synchronous resolution because a flat config
// is a plain value, produced when this module is required.
const { resolveConfig: resolvePrettierConfig } = require('@prettier/sync')
const { resolve } = require('path')

const DEFAULT_PATH = resolve(__dirname, '..', '.prettierrc')

// Prettier searches upwards from the *directory containing* the path it is
// given, so handing it a bare directory would skip that directory's own config.
// This extension-less sentinel makes the search start inside the cwd, and
// matches no `overrides` glob, so we get the project's base options.
const PROBE = '__eslint-config-opengovsg__'

/**
 * Resolve the relevant prettier config file for linting,
 * searching for one within the current working directory and
 * ancestors first. If none are found, use the default provided
 * by this package
 * @returns a Prettier configuration
 */
function resolveConfig() {
  const userProvidedConfig = resolvePrettierConfig(
    resolve(process.cwd(), PROBE),
  )
  return userProvidedConfig === null
    ? resolvePrettierConfig(DEFAULT_PATH, { config: DEFAULT_PATH })
    : userProvidedConfig
}

module.exports = { resolveConfig }
