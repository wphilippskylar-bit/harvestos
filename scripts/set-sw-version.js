// Runs before every build (see package.json "prebuild"). Stamps public/sw.js with a version tied
// to this specific deploy (Vercel's commit SHA, or the current time for local builds) so every
// new deploy invalidates the old service worker cache automatically — no more manually bumping
// CACHE_VERSION by hand and forgetting, which is what let old app versions stay cached forever.
const fs = require("fs");
const path = require("path");

const swPath = path.join(__dirname, "..", "public", "sw.js");
const version = process.env.VERCEL_GIT_COMMIT_SHA
  ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 10)
  : String(Date.now());

const original = fs.readFileSync(swPath, "utf8");
const updated = original.replace(
  /const CACHE_VERSION = ".*?";/,
  `const CACHE_VERSION = "harvestos-${version}";`
);

if (updated === original && !original.includes(`harvestos-${version}`)) {
  throw new Error("set-sw-version: could not find CACHE_VERSION line in public/sw.js to update");
}

fs.writeFileSync(swPath, updated);
console.log(`set-sw-version: public/sw.js CACHE_VERSION set to harvestos-${version}`);
