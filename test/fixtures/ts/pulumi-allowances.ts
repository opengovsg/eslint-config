// Both of these are errors under the plain TypeScript preset, and deliberately
// switched off by the Pulumi preset.

// Some XxxArgs definitions are written as empty interfaces
interface BucketArgs {}

// `const xxx = new Resource('xxx')` reads better even when xxx is never used
const unusedResource: BucketArgs = {}

export const create = (): void => undefined
