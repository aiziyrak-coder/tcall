import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const AI =
  process.argv[2] ||
  "C:/Users/alocomputers/.cursor/projects/e-Tcall-uz/assets/tcall-icon-1024.png";
const assetsDir = join(root, "assets");
mkdirSync(assetsDir, { recursive: true });
const SIZE = 1024;

const GRAD = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1FA2FF"/><stop offset="1" stop-color="#7C3AED"/></linearGradient></defs><rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/></svg>`;

function gradientBuffer() {
  return sharp(Buffer.from(GRAD)).png().toBuffer();
}

// 1) Asl AI rasmdan oq elementlarni (to'lqin + T + yuz) ajratib olamiz
const { data, info } = await sharp(AI).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels } = info;
const mask = Buffer.alloc(w * h * 4, 0);
for (let i = 0; i < w * h; i++) {
  const o = i * channels;
  const r = data[o], g = data[o + 1], b = data[o + 2], a = data[o + 3];
  if (a > 80 && Math.min(r, g, b) > 200) {
    mask[i * 4] = 255;
    mask[i * 4 + 1] = 255;
    mask[i * 4 + 2] = 255;
    mask[i * 4 + 3] = 255;
  }
}
const whiteTrimmed = await sharp(mask, { raw: { width: w, height: h, channels: 4 } })
  .png()
  .trim()
  .toBuffer();

async function placeWhite(frac) {
  const target = Math.round(SIZE * frac);
  const layer = await sharp(whiteTrimmed)
    .resize({ width: target, height: target, fit: "inside" })
    .toBuffer();
  const m = await sharp(layer).metadata();
  return {
    input: layer,
    left: Math.round((SIZE - (m.width || target)) / 2),
    top: Math.round((SIZE - (m.height || target)) / 2),
  };
}

// 2) icon-only.png — to'liq dizayn (gradient + oq elementlar)
await sharp(await gradientBuffer())
  .composite([await placeWhite(0.6)])
  .png()
  .toFile(join(assetsDir, "icon-only.png"));

// 3) icon-background.png — gradient (adaptive fon)
await sharp(await gradientBuffer()).png().toFile(join(assetsDir, "icon-background.png"));

// 4) icon-foreground.png — faqat oq elementlar, shaffof (capacitor-assets 16.7% inset qo'shadi)
await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([await placeWhite(0.7)])
  .png()
  .toFile(join(assetsDir, "icon-foreground.png"));

console.log("Icons written:", assetsDir);
