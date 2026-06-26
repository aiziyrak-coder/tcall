#!/usr/bin/env node
/**
 * Android APK yig‘ish va landing uchun nashr qilish.
 * Chiqish: public/downloads/tcall-android.apk + manifest.json yangilanishi
 *
 * Ishlatish:
 *   node scripts/publish-android-apk.mjs
 *   node scripts/publish-android-apk.mjs --skip-build   # mavjud APK dan nusxa
 */
import { spawnSync } from "child_process";
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { formatVersion } from "./version-format.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const skipBuild = process.argv.includes("--skip-build");

const androidDir = join(root, "platforms/android");
const apkBuilt = join(androidDir, "app/build/outputs/apk/debug/app-debug.apk");
const destDir = join(root, "public/downloads");
const destApk = join(destDir, "tcall-android.apk");
const manifestPath = join(destDir, "manifest.json");

function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (d) => hash.update(d))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}

function runBuild() {
  const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  console.log("Gradle: assembleDebug...");
  const r = spawnSync(gradlew, [":app:assembleDebug", "--quiet"], {
    cwd: androidDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.error("APK build muvaffaqiyatsiz");
    process.exit(r.status ?? 1);
  }
}

async function main() {
  if (!skipBuild) {
    runBuild();
  }

  if (!existsSync(apkBuilt)) {
    console.error(`APK topilmadi: ${apkBuilt}`);
    console.error("Avval build qiling yoki --skip-build ni olib tashlang.");
    process.exit(1);
  }

  mkdirSync(destDir, { recursive: true });
  copyFileSync(apkBuilt, destApk);

  const stat = statSync(destApk);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  const sha256 = await sha256File(destApk);
  const today = new Date().toISOString().slice(0, 10);

  const versionJson = JSON.parse(readFileSync(join(root, "packages/tcall-core/version.json"), "utf8"));
  const version = formatVersion(versionJson);

  let manifest = {
    version,
    updated: today,
    platforms: {},
    webApp: "https://web.tcall.uz",
  };
  if (existsSync(manifestPath)) {
    try {
      manifest = { ...manifest, ...JSON.parse(readFileSync(manifestPath, "utf8")) };
    } catch {
      /* default */
    }
  }

  manifest.version = version;
  manifest.updated = today;
  manifest.webApp = "https://web.tcall.uz";
  manifest.platforms = {
    ...manifest.platforms,
    android: {
      file: "tcall-android.apk",
      label: "Android APK",
      minOs: "Android 8.0+",
      sizeBytes: stat.size,
      sizeLabel: `${sizeMb} MB`,
      sha256,
      package: "uz.tcall",
      status: "available",
    },
    ios: manifest.platforms?.ios ?? {
      file: null,
      label: "App Store",
      minOs: "iOS 16.0+",
      status: "coming_soon",
    },
    windows: manifest.platforms?.windows ?? {
      file: "tcall-windows-setup.exe",
      label: "Windows Installer",
      minOs: "Windows 10/11 64-bit",
      status: "coming_soon",
    },
    linux: manifest.platforms?.linux ?? {
      file: "tcall-linux-x64.AppImage",
      label: "Linux AppImage",
      minOs: "Ubuntu 22.04+",
      status: "coming_soon",
    },
  };

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log("");
  console.log("=== APK nashr qilindi ===");
  console.log(`Versiya:  ${version}`);
  console.log(`Fayl:     public/downloads/tcall-android.apk`);
  console.log(`Hajm:     ${sizeMb} MB`);
  console.log(`SHA-256:  ${sha256.slice(0, 16)}...`);
  console.log(`URL:      https://tcall.uz/downloads/tcall-android.apk`);
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
