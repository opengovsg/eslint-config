// The @pulumi rules match on a type whose alias symbol is named `Output` /
// `OutputInstance`, so a local alias exercises the rule without pulling in the
// whole Pulumi SDK.
type Output<T> = { readonly value: T }

const bucketArn: Output<string> = { value: 'arn:aws:s3:::bucket' }

export const message = `bucket is ${bucketArn}`
