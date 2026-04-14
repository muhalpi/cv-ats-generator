// CommonJS-compatible export for Vercel Node runtime
const app = require("../artifacts/api-server/src/app-serverless").default;

module.exports = app;
