import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { copyFileSync, existsSync } from "fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceArg = process.argv[2];
const source =
  sourceArg ||
  join(
    root,
    "assets",
    "c__Users_alocomputers_AppData_Roaming_Cursor_User_workspaceStorage_5ec0e60726502dc239f5db3d2f3efa3b_images_image-917a7e52-a826-4c50-a774-6f0ff36057e3.png"
  );

if (!existsSync(source)) {
  console.error("Source logo not found:", source);
  process.exit(1);
}

const outputFull = join(root, "public", "logo.png");
const outputIcon = join(root, "public", "logo-icon.png");
const favicon = join(root, "public", "favicon.ico");

let img = sharp(source).ensureAlpha();
const meta = await img.metadata();

const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;

function isBackground(r, g, b) {
  if (r > 248 && g > 248 && b > 248) return true;
  if (r > 235 && g > 235 && b > 235 && Math.max(r, g, b) - Math.min(r, g, b) < 12) return true;
  return false;
}

const visited = new Uint8Array(w * h);
const queue = [];

for (const [x, y] of [
  [0, 0],
  [w - 1, 0],
  [0, h - 1],
  [w - 1, h - 1],
  ...Array.from({ length: w }, (_, i) => [i, 0]),
  ...Array.from({ length: w }, (_, i) => [i, h - 1]),
]) {
  queue.push(x, y);
}

while (queue.length) {
  const y = queue.pop();
  const x = queue.pop();
  if (x == null || y == null || x < 0 || y < 0 || x >= w || y >= h) continue;
  const p = y * w + x;
  if (visited[p]) continue;
  const i = p * 4;
  if (!isBackground(data[i], data[i + 1], data[i + 2])) continue;
  visited[p] = 1;
  data[i + 3] = 0;
  queue.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}

const trimmed = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .trim({ threshold: 10 })
  .png()
  .toBuffer();

const trimmedMeta = await sharp(trimmed).metadata();
const th = trimmedMeta.height || h;
const tw = trimmedMeta.width || w;

// Left square icon (rounded app icon without text)
const iconSize = th;
const iconBuffer = await sharp(trimmed)
  .extract({ left: 0, top: 0, width: Math.min(iconSize, tw), height: iconSize })
  .png()
  .toBuffer();

await sharp(trimmed).png().toFile(outputFull);
await sharp(iconBuffer).png().toFile(outputIcon);
await sharp(iconBuffer).resize(32, 32).png().toFile(favicon);

console.log("Done:", { full: outputFull, icon: outputIcon, favicon, size: `${tw}x${th}` });
