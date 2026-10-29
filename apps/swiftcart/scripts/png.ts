import { deflateSync } from "node:zlib";

/**
 * Minimal PNG writer: 8 bit RGBA, one IDAT, no external dependency.
 * Used by the seed to produce raster demo imagery without shipping sharp.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

export function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function mix(a: number[], b: number[], t: number): number[] {
  return [
    Math.round(a[0]! + (b[0]! - a[0]!) * t),
    Math.round(a[1]! + (b[1]! - a[1]!) * t),
    Math.round(a[2]! + (b[2]! - a[2]!) * t),
  ];
}

/**
 * Demo artwork: a dark studio field with a muted colour wash and a fine rule.
 * Deliberately low contrast so a real photograph can replace it without the
 * page changing character.
 */
export function posterTile(width: number, height: number, hue: number): Buffer {
  const accent = [
    110 + 70 * Math.cos((hue * Math.PI) / 180),
    110 + 70 * Math.cos(((hue - 120) * Math.PI) / 180),
    110 + 70 * Math.cos(((hue - 240) * Math.PI) / 180),
  ];
  const base = [18, 18, 21];
  const lift = [30, 30, 34];
  const cx = width * 0.58;
  const cy = height * 0.42;
  const radius = Math.min(width, height) * 0.95;

  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const vertical = y / height;
      let color = mix(base, lift, 0.35 + vertical * 0.5);

      // Wide, soft colour wash.
      const distance = Math.hypot((x - cx) / radius, (y - cy) / radius);
      if (distance < 1) {
        const wash = Math.pow(1 - distance, 2.4) * 0.22;
        color = mix(color, accent, wash);
      }

      // Vignette keeps the edges from glowing.
      const edgeX = Math.abs(x / width - 0.5) * 2;
      const edgeY = Math.abs(vertical - 0.5) * 2;
      const vignette = Math.max(edgeX, edgeY) ** 3 * 0.45;
      color = mix(color, [8, 8, 10], vignette);

      // A single hairline rule, the way a catalogue plate would be trimmed.
      if (Math.abs(vertical - 0.86) < 0.0016) color = mix(color, accent, 0.5);

      const index = (y * width + x) * 4;
      rgba[index] = Math.max(0, Math.min(255, Math.round(color[0]!)));
      rgba[index + 1] = Math.max(0, Math.min(255, Math.round(color[1]!)));
      rgba[index + 2] = Math.max(0, Math.min(255, Math.round(color[2]!)));
      rgba[index + 3] = 255;
    }
  }

  return encodePng(width, height, rgba);
}
