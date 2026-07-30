const { defineConfig, globalIgnores } = require('eslint/config')

const javascript = require('./javascript')

module.exports = defineConfig([
  // Fixtures are deliberately non-conforming — they are the test inputs.
  globalIgnores(['test/fixtures/**']),
  ...javascript,
])
