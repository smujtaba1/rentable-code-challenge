// CRA's "proxy" field in package.json skips any request whose Accept header
// asks for HTML, serving index.html instead so client-side routing works.
// That breaks a plain download link: the browser navigates, gets the SPA, and
// no file arrives. This proxies /api unconditionally, and supersedes the
// package.json field. Dev server only - production has no proxy, so the link
// reaches the real backend directly.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'http://127.0.0.1:8009',
            changeOrigin: false,
        })
    );
};
