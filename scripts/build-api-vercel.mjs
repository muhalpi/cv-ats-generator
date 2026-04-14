import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

globalThis.require = createRequire(import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entryPoint = path.resolve(root, "artifacts/api-server/src/app-serverless.ts");
const outFile = path.resolve(root, "api/index.js");

console.log("Building serverless API bundle...");

await esbuild({
  entryPoints: [entryPoint],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: outFile,
  logLevel: "info",
  external: [
    "*.node",
    "pg-native",
    "sharp",
    "canvas",
    "bcrypt",
    "argon2",
    "fsevents",
  ],
  sourcemap: false,
  banner: {
    js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
  },
});

console.log(`Serverless API bundle written to: ${outFile}`);
