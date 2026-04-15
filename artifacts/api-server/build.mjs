import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  // Build server entry (old)
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    sourcemap: "linked",
  });

  // Build serverless app (needed by /api/index.ts)
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/app-serverless.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: path.resolve(distDir, "app-serverless.mjs"),
    logLevel: "info",
    sourcemap: "linked",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
