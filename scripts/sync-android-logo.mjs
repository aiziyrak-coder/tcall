import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { copyFileSync } from "fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "assets", "logo.png");

const targets = {
  full: [
    join(root, "public", "logo.png"),
    join(root, "platforms", "android", "app", "src", "main", "res", "drawable", "tcall_logo_full.png"),
  ],
  icon: [
    join(root, "public", "logo-icon.png"),
    join(root, "platforms", "android", "app", "src", "main", "res", "drawable", "tcall_logo_icon.png"),
  ],
};

function isNearBlack(r, g, b) {
  return r < 45 && g < 45 && b < 45;
}

function isNearWhite(r, g, b) {
  return r > 242 && g > 242 && b > 242;
}

function isDarkInk(r, g, b) {
  return r < 95 && g < 95 && b < 110;
}

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const iconCutoff = Math.round(w * 0.34);

// 1) Orqa fon — qora va oq flood-fill (chetdan)
const visited = new Uint8Array(w * h);
const queue = [];

function pushIfBg(x, y, test) {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const p = y * w + x;
  if (visited[p]) return;
  const i = p * 4;
  if (!test(data[i], data[i + 1], data[i + 2])) return;
  visited[p] = 1;
  data[i + 3] = 0;
  queue.push(x, y);
}

for (let x = 0; x < w; x++) {
  pushIfBg(x, 0, isNearBlack);
  pushIfBg(x, h - 1, isNearBlack);
  pushIfBg(x, 0, isNearWhite);
  pushIfBg(x, h - 1, isNearWhite);
}
for (let y = 0; y < h; y++) {
  pushIfBg(0, y, isNearBlack);
  pushIfBg(w - 1, y, isNearBlack);
  pushIfBg(0, y, isNearWhite);
  pushIfBg(w - 1, y, isNearWhite);
}

while (queue.length) {
  const y = queue.pop();
  const x = queue.pop();
  for (const [nx, ny] of [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ]) {
    pushIfBg(nx, ny, isNearBlack);
    pushIfBg(nx, ny, isNearWhite);
  }
}

// 2) Harflar ichidagi oq fonlar (matn zonasida)
for (let y = 1; y < h - 1; y++) {
  for (let x = iconCutoff; x < w - 1; x++) {
    const p = y * w + x;
    const i = p * 4;
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (!isNearWhite(r, g, b)) continue;

    let nearInk = false;
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      const ni = (ny * w + nx) * 4;
      if (isDarkInk(data[ni], data[ni + 1], data[ni + 2])) {
        nearInk = true;
        break;
      }
    }
    if (nearInk) data[i + 3] = 0;
  }
}

const trimmed = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .trim({ threshold: 12 })
  .png()
  .toBuffer();

const meta = await sharp(trimmed).metadata();
const tw = meta.width || w;
const th = meta.height || h;
const iconW = Math.min(th, tw);

const iconBuf = await sharp(trimmed)
  .extract({ left: 0, top: 0, width: iconW, height: th })
  .png()
  .toBuffer();

for (const path of targets.full) {
  await sharp(trimmed).png().toFile(path);
}
for (const path of targets.icon) {
  await sharp(iconBuf).png().toFile(path);
}

console.log("Android logo synced:", { full: `${tw}x${th}`, icon: `${iconW}x${th}` });
