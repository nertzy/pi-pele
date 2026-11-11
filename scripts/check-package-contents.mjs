import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const expectedFiles = [
  "LICENSE",
  "README.md",
  "extension.ts",
  "package.json",
  "src/command.ts",
  "src/diagram.ts",
  "src/fences.ts",
  "src/pi-theme.ts",
  "src/preview.ts",
  "src/rasterize.ts",
  "src/static-svg.ts",
  "src/themes.ts",
  "src/tool.ts",
];
const pack = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json"], {
    encoding: "utf8",
  }),
);
const [{ files }] = Array.isArray(pack) ? pack : Object.values(pack);
const actualFiles = files.map(({ path }) => path).sort();

assert.deepEqual(actualFiles, expectedFiles);
console.log(`Package contents match: ${actualFiles.join(", ")}`);
