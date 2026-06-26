#!/usr/bin/env node
/**
 * Patch +1: 1.000000 → 1.000001
 * Major: node scripts/version-bump.mjs --major  → 2.000000
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { formatVersion } from "./version-format.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const versionPath = join(root, "packages/tcall-core/version.json");
const v = JSON.parse(readFileSync(versionPath, "utf8"));
const major = process.argv.includes("--major");

if (major) {
  v.major += 1;
  v.patch = 0;
} else {
  v.patch += 1;
}

writeFileSync(versionPath, `${JSON.stringify(v, null, 2)}\n`, "utf8");
const display = formatVersion(v);
console.log(`Version bumped to ${display}`);

spawnSync(process.execPath, [join(root, "scripts/version-sync.mjs")], {
  stdio: "inherit",
  cwd: root,
});
