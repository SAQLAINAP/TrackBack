#!/usr/bin/env node
/**
 * Render the TrackBack mark — a white check on the accent gradient — to every
 * icon the app needs, so the launcher, the PWA and the in-app header all show
 * the same thing.
 *
 * Rasterises via signed distance fields and writes PNGs with only node:zlib, so
 * there's no ImageMagick/sharp/librsvg dependency to install on a machine or in
 * CI. The Android adaptive icon is a pair of vector drawables instead (written
 * by hand next to this script's output) since those scale for free.
 *
 * Usage: node scripts/make-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** bg-accent-grad: linear-gradient(135deg, …) from tailwind.config.js. */
const STOPS = [
  [0.0, [0x63, 0x66, 0xf1]],
  [0.5, [0x8b, 0x5c, 0xf6]],
  [1.0, [0xd9, 0x46, 0xef]],
];

/** IconMark's path, in its own 24-unit viewBox. */
const CHECK = [
  [4, 13.5],
  [9, 18.5],
  [20, 6.5],
];
const CHECK_STROKE = 2.5;

/**
 * Fraction of the tile the 24-unit check box occupies. The in-app mark is a
 * 15px glyph in a 28px tile; a hair tighter reads better once the launcher
 * rounds the corners.
 */
const CONTENT = 0.52;

const lerp = (a, b, t) => a + (b - a) * t;

function gradientAt(t) {
  const u = Math.min(1, Math.max(0, t));
  for (let i = 1; i < STOPS.length; i++) {
    const [t0, c0] = STOPS[i - 1];
    const [t1, c1] = STOPS[i];
    if (u <= t1) {
      const k = (u - t0) / (t1 - t0);
      return [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

/** Rounded-rectangle SDF; negative inside. */
function sdRoundRect(px, py, cx, cy, halfW, halfH, r) {
  const qx = Math.abs(px - cx) - (halfW - r);
  const qy = Math.abs(py - cy) - (halfH - r);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - r;
}

/** Distance from a point to a segment. */
function sdSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, (wx * vx + wy * vy) / len2));
  return Math.hypot(wx - vx * t, wy - vy * t);
}

/**
 * @param size    edge length in px
 * @param shape   "squircle" | "circle" | "full" (full = edge-to-edge, for
 *                `purpose: "maskable"`, where the platform applies its own mask
 *                and any transparent corner of ours would show through it)
 */
function render(size, shape) {
  const px = Buffer.alloc(size * size * 4);
  const c = size / 2;
  // Android's own launcher radius is ~22% of the tile.
  const radius = size * 0.22;

  // Map the 24-unit viewBox into a centred box of `CONTENT` of the tile.
  const scale = (size * CONTENT) / 24;
  const ox = c - (24 * scale) / 2;
  const oy = c - (24 * scale) / 2;
  const pts = CHECK.map(([x, y]) => [ox + x * scale, oy + y * scale]);
  const half = (CHECK_STROKE * scale) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = x + 0.5;
      const sy = y + 0.5;

      let baseA = 0;
      if (shape === "squircle") {
        baseA = coverage(sdRoundRect(sx, sy, c, c, c, c, radius));
      } else if (shape === "circle") {
        baseA = coverage(Math.hypot(sx - c, sy - c) - c);
      } else if (shape === "full") {
        baseA = 1;
      }

      // Round caps and joins fall out of taking the min over segments.
      let d = Infinity;
      for (let i = 1; i < pts.length; i++) {
        d = Math.min(d, sdSegment(sx, sy, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
      }
      const checkA = coverage(d - half);

      const [r, g, b] = gradientAt((sx + sy) / (2 * size));
      // Check over gradient, both premultiplied down to straight alpha.
      const outA = baseA + checkA * (1 - baseA);
      const i = (y * size + x) * 4;
      if (outA <= 0) continue;
      const mix = (channel) => (channel * baseA * (1 - checkA) + 255 * checkA) / outA;
      px[i] = Math.round(mix(r));
      px[i + 1] = Math.round(mix(g));
      px[i + 2] = Math.round(mix(b));
      px[i + 3] = Math.round(outA * 255);
    }
  }
  return px;
}

/** Analytic 1px-wide edge coverage from a signed distance. */
function coverage(d) {
  return Math.min(1, Math.max(0, 0.5 - d));
}

// ---- PNG encoding ----
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  // Each scanline is prefixed with filter type 0 (none).
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function write(path, size, shape) {
  const full = resolve(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  const buf = encodePng(size, render(size, shape));
  writeFileSync(full, buf);
  console.log(`${String(size).padStart(4)}px ${shape.padEnd(9)} ${(buf.length / 1024).toFixed(1)}kB  ${path}`);
}

// PWA + favicon fallback.
write("public/icon-192.png", 192, "squircle");
write("public/icon-512.png", 512, "squircle");
write("public/apple-touch-icon.png", 180, "squircle");

/*
 * Separate maskable icon. It has to be edge-to-edge: the installer crops it to
 * whatever shape the platform uses, so reusing the squircle would leave its
 * transparent corners visible inside that shape. CONTENT 0.52 puts the glyph's
 * 23.5-unit diagonal at 0.51 of the edge, comfortably inside the 80% safe
 * circle the spec guarantees, so nothing needs shrinking for the crop.
 */
write("public/icon-maskable-512.png", 512, "full");

// Legacy Android launcher icons (API 24–25; adaptive vectors cover 26+).
const DPI = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [dpi, size] of Object.entries(DPI)) {
  write(`android/app/src/main/res/mipmap-${dpi}/ic_launcher.png`, size, "squircle");
  write(`android/app/src/main/res/mipmap-${dpi}/ic_launcher_round.png`, size, "circle");
}
