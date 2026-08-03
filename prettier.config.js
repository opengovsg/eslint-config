// The only copy of the Prettier style, exported to consumers as
// `@opengovsg/eslint-config/prettier` and used to format this repo.
//
// Named `prettier.config.js` because Prettier only recognises a fixed set of
// config filenames, and that is what lets it format this repo with no further
// wiring — we cannot ship a style we do not write ourselves.
//
// JavaScript rather than a `.prettierrc` because Prettier loads whatever a
// config reference resolves to *as JavaScript* — an extension-less JSON file
// fails to parse when another package points at it. Requiring a module is also
// plain Node resolution, so it survives Prettier 4 dropping package names in
// the `prettier` key of package.json (prettier/prettier#15741).
module.exports = {
  printWidth: 80,
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
}
