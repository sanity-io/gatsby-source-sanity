// Proxy to TypeScript-compiled output.
// Note that unlike gatsby-node.js, we need to explicitly define the exported hooks
// as they seem to be statically analyzed at build time.
const ssr = require('./lib/gatsby-ssr')

exports.onRenderBody = ssr.onRenderBody
