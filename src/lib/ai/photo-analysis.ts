import "server-only";
import sharp from "sharp";

export type PhotoAnalysis = {
  accentColor: string;
  textZone: "top" | "bottom";
};

// Cheap, deterministic, fully offline analysis of the source photo so a
// flyer's accent color and text placement actually react to the specific
// image instead of using the same fixed brand gold / top-anchored layout
// every time. No AI call involved — instant, and never at risk of hitting
// an API quota.
export async function analyzePhoto(buffer: Buffer): Promise<PhotoAnalysis> {
  const [accentColor, textZone] = await Promise.all([
    extractAccentColor(buffer),
    pickCalmZone(buffer),
  ]);
  return { accentColor, textZone };
}

const FALLBACK_ACCENT = "#F2A93B";

async function extractAccentColor(buffer: Buffer): Promise<string> {
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let best: { h: number; s: number; l: number } | null = null;
  let bestSaturation = -1;

  for (let i = 0; i + 2 < data.length; i += info.channels) {
    const { h, s, l } = rgbToHsl(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
    // Skip near-black/near-white pixels (walls, overexposed highlights,
    // shadows) — they're rarely what makes a photo feel distinctive, and
    // they'd only ever produce a muddy or washed-out accent color.
    if (l < 0.15 || l > 0.9) continue;
    if (s > bestSaturation) {
      bestSaturation = s;
      best = { h, s, l };
    }
  }

  // Very neutral/gray photos (common in office settings) have no standout
  // color to extract — fall back to the brand's own gold rather than
  // forcing an arbitrary, likely-ugly hue.
  if (!best || bestSaturation < 0.15) return FALLBACK_ACCENT;

  // Clamp into a range that still reads as a clean, confident flyer accent
  // rather than the pale or muddy tone that a literal photo sample usually
  // produces.
  const s = Math.min(0.85, Math.max(0.45, best.s));
  const l = Math.min(0.6, Math.max(0.38, best.l));
  return hslToHex(best.h, s, l);
}

async function pickCalmZone(buffer: Buffer): Promise<"top" | "bottom"> {
  const width = 200;
  const height = 200;
  const half = height / 2;

  const { data } = await sharp(buffer)
    .resize(width, height, { fit: "cover" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Computed directly from the raw pixel buffer (rather than sharp's
  // extract()+stats() on cloned pipelines, which — confirmed by testing —
  // doesn't reliably scope stats() to the extracted region) so top vs.
  // bottom busyness is unambiguous.
  const topStdev = greyscaleStdev(data, 0, half * width);
  const bottomStdev = greyscaleStdev(data, half * width, height * width);

  // Lower standard deviation = less visual detail/contrast = a calmer area
  // to lay text and a scrim over without fighting the photo (or covering
  // whatever the busier half likely contains — faces, signage, etc).
  return topStdev <= bottomStdev ? "top" : "bottom";
}

function greyscaleStdev(data: Buffer, start: number, end: number): number {
  let sum = 0;
  for (let i = start; i < end; i++) sum += data[i];
  const mean = sum / (end - start);

  let variance = 0;
  for (let i = start; i < end; i++) variance += (data[i] - mean) ** 2;
  return Math.sqrt(variance / (end - start));
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hueToRgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hueToRgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hueToRgb(p, q, h) * 255);
  const b = Math.round(hueToRgb(p, q, h - 1 / 3) * 255);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
