import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const input = join(root, "public", "logo.png");
const output = join(root, "public", "logo.png");
const favicon = join(root, "public", "favicon.ico");

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

// Flood-fill background from corners (near-black pixels)
const w = info.width;
const h = info.height;
const visited = new Uint8Array(w * h);
const queue = [];

function idx(x, y) {
  return y * w + x;
}

function isBg(x, y) {
  const i = (y * w + x) * 4;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  return r < 50 && g < 50 && b < 50;
}

for (const [x, y] of [
  [0, 0],
  [w - 1, 0],
  [0, h - 1],
  [w - 1, h - 1],
]) {
  if (isBg(x, y)) queue.push([x, y]);
}

while (queue.length) {
  const [x, y] = queue.pop();
  if (x < 0 || y < 0 || x >= w || y >= h) continue;
  const p = idx(x, y);
  if (visited[p]) continue;
  if (!isBg(x, y)) continue;
  visited[p] = 1;
  data[p * 4 + 3] = 0;
  queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .trim({ threshold: 1 })
  .png()
  .toFile(output);

await sharp(output).resize(32, 32).toFile(favicon);

console.log("Logo flood-fill transparency + trim + favicon done");
