// A React component, not infrastructure. The Pulumi preset's carve-outs must
// not reach it: `unused` should still be reported.
export const Component = () => {
  const unused = 1
  return <p>hello</p>
}
