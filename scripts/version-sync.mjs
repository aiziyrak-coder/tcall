#!/usr/bin/env node
/**
 * packages/tcall-core/version.json → barcha platformalar.
 * Ishga tushirish: node scripts/version-sync.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { formatVersion } from "./version-format.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const versionPath = join(root, "packages/tcall-core/version.json");
const v = JSON.parse(readFileSync(versionPath, "utf8"));
const display = formatVersion(v);

writeFileSync(join(root, "VERSION"), `${display}\n`, "utf8");

// Android
const gradlePath = join(root, "platforms/android/app/build.gradle");
try {
  let gradle = readFileSync(gradlePath, "utf8");
  const code = v.major * 1_000_000 + v.patch;
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${code}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${display}"`);
  writeFileSync(gradlePath, gradle, "utf8");
} catch {
  /* android not moved yet */
}

// iOS Info.plist style version file
const iosVersionPath = join(root, "platforms/ios/Tcall/Version.plist");
try {
  writeFileSync(
    iosVersionPath,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleShortVersionString</key><string>${display}</string>
  <key>CFBundleVersion</key><string>${v.patch}</string>
</dict></plist>\n`,
    "utf8"
  );
} catch {
  /* ok */
}

// Windows / Linux .csproj
for (const platform of ["windows", "linux"]) {
  const csproj = join(root, `platforms/${platform}/Tcall.${platform === "windows" ? "Windows" : "Linux"}.csproj`);
  try {
    let xml = readFileSync(csproj, "utf8");
    xml = xml.replace(/<Version>[^<]+<\/Version>/, `<Version>${display}</Version>`);
    writeFileSync(csproj, xml, "utf8");
  } catch {
    /* ok */
  }
}

// Server package.json (reference only)
const pkgPath = join(root, "package.json");
try {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.version = display;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
} catch {
  /* ok */
}

// Desktop TcallConfig
const desktopConfig = join(root, "packages/desktop-core/TcallConfig.cs");
try {
  let cs = readFileSync(desktopConfig, "utf8");
  cs = cs.replace(/AppVersion = "[^"]+"/, `AppVersion = "${display}"`);
  writeFileSync(desktopConfig, cs, "utf8");
} catch { /* ok */ }

// iOS TcallConfig appVersion
const iosApiModels = join(root, "platforms/ios/Tcall/Models/ApiModels.swift");
try {
  let swift = readFileSync(iosApiModels, "utf8");
  swift = swift.replace(/appVersion = "[^"]+"/, `appVersion = "${display}"`);
  writeFileSync(iosApiModels, swift, "utf8");
} catch { /* ok */ }

// Web manifest
const manifestPath = join(root, "public/manifest.json");
try {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.version = display;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
} catch {
  /* ok */
}

// Downloads manifest
const downloadsManifest = join(root, "public/downloads/manifest.json");
try {
  const dl = JSON.parse(readFileSync(downloadsManifest, "utf8"));
  dl.version = display;
  writeFileSync(downloadsManifest, `${JSON.stringify(dl, null, 2)}\n`, "utf8");
} catch {
  /* ok */
}

console.log(`Synced version ${display} to all platforms.`);
