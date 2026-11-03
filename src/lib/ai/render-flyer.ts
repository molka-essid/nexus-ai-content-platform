import "server-only";
import sharp from "sharp";
import satori from "satori";
import { readFile } from "node:fs/promises";
import path from "node:path";

const CANVAS_WIDTH = 1080;
const HERO_HEIGHT = 760;
const PADDING = 60;
const LOGO_WIDTH = 220;
const LOGO_PATH = path.join(process.cwd(), "public", "brand-logo.png");

// Serverless hosts (Vercel) have no system fonts installed at all, and the
// SVG engine sharp uses to rasterize <text> (librsvg) doesn't support
// @font-face embedding either — both were tried and confirmed to render
// nothing. Satori sidesteps this entirely: it shapes text into vector
// <path> outlines itself using a font file we hand it directly, so the
// output SVG has no live text/font dependency left for librsvg to fail on.
// It's the same approach Vercel's own next/og image generation uses, for
// exactly this reason. Fonts are loaded once per server instance and cached.
const FONT_DIR = path.join(process.cwd(), "public", "fonts");
type SatoriFont = { name: string; data: Buffer; weight: 400 | 700 | 900; style: "normal" };
let cachedFonts: SatoriFont[] | null = null;

async function loadFonts(): Promise<SatoriFont[]> {
  if (cachedFonts) return cachedFonts;
  const [regular, bold, black] = await Promise.all([
    readFile(path.join(FONT_DIR, "Inter-Regular.ttf")),
    readFile(path.join(FONT_DIR, "Inter-Bold.ttf")),
    readFile(path.join(FONT_DIR, "Inter-Black.ttf")),
  ]);
  cachedFonts = [
    { name: "Inter", data: regular, weight: 400, style: "normal" },
    { name: "Inter", data: bold, weight: 700, style: "normal" },
    { name: "Inter", data: black, weight: 900, style: "normal" },
  ];
  return cachedFonts;
}

// One line of text, positioned the same way the old SVG <text>/<tspan>
// approach was: (x, y) is the visual baseline, matching every existing
// layout calculation below — only the rendering mechanism changed.
type TextItem = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: 400 | 700 | 900;
  color: string;
  align?: "left" | "right";
};

async function renderTextLayer(width: number, height: number, items: TextItem[]): Promise<Buffer> {
  const fonts = await loadFonts();
  // satori's TS types expect a real React element; we build the equivalent
  // plain-object shape directly (a documented satori usage pattern) rather
  // than pull in JSX for a handful of divs, so this is cast past that check.
  const svg = await satori(
    {
      type: "div",
      props: {
        style: { width, height, display: "flex", position: "relative" },
        children: items.map((item, i) => ({
          type: "div",
          key: i,
          props: {
            style: {
              position: "absolute",
              ...(item.align === "right" ? { right: width - item.x } : { left: item.x }),
              // Satori positions the box's top edge; SVG <text> positioned
              // the baseline. ~0.78x font size approximates Inter's ascent
              // closely enough for a marketing flyer (not typographically
              // exact, same tolerance the old wrapText() heuristic had).
              top: item.y - item.fontSize * 0.78,
              fontSize: item.fontSize,
              fontWeight: item.fontWeight,
              color: item.color,
              fontFamily: "Inter",
              whiteSpace: "pre",
              lineHeight: 1,
            },
            children: item.text,
          },
        })),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    { width, height, fonts },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function linesToItems(
  lines: string[],
  x: number,
  startY: number,
  lineGap: number,
  fontSize: number,
  fontWeight: 400 | 700 | 900,
  color: string,
  align: "left" | "right" = "left",
): TextItem[] {
  return lines.map((line, i) => ({
    text: line,
    x,
    y: startY + i * lineGap,
    fontSize,
    fontWeight,
    color,
    align,
  }));
}

// Composites a text layer on top of a background raster and flattens to one
// buffer — the pattern every text-bearing section below uses.
async function withTextLayer(background: Buffer, width: number, height: number, items: TextItem[]): Promise<Buffer> {
  if (items.length === 0) return background;
  const textLayer = await renderTextLayer(width, height, items);
  return sharp(background).composite([{ input: textLayer, top: 0, left: 0 }]).png().toBuffer();
}

// Six structurally-distinct templates. A generation only ever shows
// OPTIONS_PER_GENERATION of them at once (see pickStyles), so regenerating
// draws a different subset each time instead of re-rendering the exact same
// three looks over and over.
export type FlyerStyle = 0 | 1 | 2 | 3 | 4 | 5;
export const FLYER_TEMPLATE_COUNT = 6;
export const OPTIONS_PER_GENERATION = 3;
/** @deprecated kept for callers that only care "how many options render" */
export const FLYER_STYLE_COUNT = OPTIONS_PER_GENERATION;

// SVG <text> doesn't wrap on its own and we don't have real font metrics
// available server-side, so this estimates characters-per-line from font
// size. Good enough for ad-copy-length text; not typographically precise.
function wrapText(text: string, maxWidth: number, fontSize: number, charWidthFactor = 0.58): string[] {
  const avgCharWidth = fontSize * charWidthFactor;
  const maxChars = Math.max(1, Math.floor(maxWidth / avgCharWidth));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Tries fontSize first; if that overflows maxLines, shrinks once (~85%) and
// re-wraps. Prevents long AI-generated titles from clipping or overrunning
// their allotted space instead of silently truncating them.
function fitText(
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines: number,
): { lines: string[]; fontSize: number } {
  let size = fontSize;
  let lines = wrapText(text, maxWidth, size);
  if (lines.length > maxLines) {
    size = Math.round(fontSize * 0.85);
    lines = wrapText(text, maxWidth, size);
  }
  return { lines: lines.slice(0, maxLines), fontSize: size };
}

// A simple check-mark glyph, drawn as a path so it renders identically
// regardless of what fonts the host has installed (icon fonts/emoji aren't
// reliable in server-side SVG rasterization). Pure shapes — no text, no
// font dependency, so this stays plain SVG via librsvg same as before.
function checkIcon(cx: number, cy: number, size: number, color: string): string {
  const s = size / 24;
  return `<g transform="translate(${cx - size / 2}, ${cy - size / 2}) scale(${s})">
    <circle cx="12" cy="12" r="12" fill="${color}" />
    <path d="M7 12.5l3 3 7-7" stroke="white" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  </g>`;
}

// Deterministic-enough shuffle for picking which OPTIONS_PER_GENERATION
// templates out of the FLYER_TEMPLATE_COUNT pool to render this time.
// Rerolls once if the result exactly matches excludeCombo (the set shown
// immediately before), so "Regenerate" always produces a visibly different
// batch rather than occasionally re-rendering the same three by chance.
export function pickStyles(excludeCombo: number[], poolSize = FLYER_TEMPLATE_COUNT, count = OPTIONS_PER_GENERATION): FlyerStyle[] {
  const shuffle = () => {
    const pool = Array.from({ length: poolSize }, (_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  };

  const excludeSet = new Set(excludeCombo);
  let picked = shuffle();
  const isSameSet = (a: number[]) => a.length === excludeSet.size && a.every((n) => excludeSet.has(n));

  if (excludeCombo.length > 0 && isSameSet(picked)) {
    picked = shuffle();
  }

  return picked.sort((a, b) => a - b) as FlyerStyle[];
}

export async function renderFlyer(input: {
  photoBuffer: Buffer;
  headline: string;
  badge?: string;
  highlights: string[];
  cta: string;
  hashtags: string[];
  colorPrimary: string;
  colorAccent: string;
  style: FlyerStyle;
  // Which half of the photo is visually calmest (see photo-analysis.ts) —
  // lets the overlay styles anchor the headline/scrim there instead of
  // always assuming the top, so text doesn't fight the photo's actual
  // subject. Defaults to "top" (the original fixed behavior) when omitted.
  textZone?: "top" | "bottom";
}): Promise<Buffer> {
  const { style } = input;

  const logoBuffer = await sharp(await readFile(LOGO_PATH)).resize({ width: LOGO_WIDTH }).toBuffer();
  const logoHeight = (await sharp(logoBuffer).metadata()).height ?? 80;

  // Styles 3 and 4 put the headline in its own panel rather than over the
  // photo, so they route through dedicated builders. Styles 0/1/2/5 share
  // the "photo + overlaid text" hero builder with different treatments.
  if (style === 3) {
    return renderSplitPanel(input, logoBuffer, logoHeight);
  }
  if (style === 4) {
    return renderFramedCard(input, logoBuffer);
  }
  return renderOverlayHero(input, logoBuffer, logoHeight, style as 0 | 1 | 2 | 5);
}

// --- Shared: highlights section + footer, used by every template -----------

async function buildHighlightsSection(
  highlights: string[],
  primary: string,
  accent: string,
  variant: "light" | "tint" | "white-on-dark",
) {
  const highlightFontSize = 30;
  const highlightRowGap = 26;
  const iconSize = 30;
  const textX = PADDING + iconSize + 18;
  const bulletTextMaxWidth = CANVAS_WIDTH - textX - PADDING;

  let cursorY = PADDING + highlightFontSize;
  const icons: string[] = [];
  const textItems: TextItem[] = [];
  for (const highlight of highlights) {
    const { lines, fontSize } = fitText(highlight, bulletTextMaxWidth, highlightFontSize, 2);
    const lineGap = fontSize + 10;
    const iconY = cursorY - fontSize * 0.32;
    icons.push(checkIcon(PADDING + iconSize / 2, iconY, iconSize, accent));
    textItems.push(...linesToItems(lines, textX, cursorY, lineGap, fontSize, 700, primary));
    cursorY += lines.length * lineGap + highlightRowGap;
  }

  const height = cursorY - highlightRowGap + PADDING - highlightFontSize + 20;
  const bg = variant === "tint" ? accent : "#FFFFFF";
  const bgOpacity = variant === "tint" ? 0.07 : 1;

  const backgroundSvg = `
<svg width="${CANVAS_WIDTH}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${CANVAS_WIDTH}" height="${height}" fill="${bg}" fill-opacity="${bgOpacity}" />
  ${variant === "tint" ? `<rect x="0" y="0" width="${CANVAS_WIDTH}" height="${height}" fill="white" fill-opacity="0.93" />` : ""}
  ${icons.join("\n")}
</svg>`;

  const background = await sharp(Buffer.from(backgroundSvg)).png().toBuffer();
  const buffer = await withTextLayer(background, CANVAS_WIDTH, height, textItems);
  return { buffer, height };
}

async function buildFooter(cta: string, hashtags: string[], primary: string, accent: string, mode: "navy" | "gold") {
  const ctaFontSize = 32;
  const hashtagFontSize = 24;
  const footerLineGap = ctaFontSize + 10;
  const { lines: ctaLines } = fitText(cta, CANVAS_WIDTH - PADDING * 2, ctaFontSize, 2);
  const hashtagLine = hashtags
    .slice(0, 4)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .join("  ");
  const hashtagLines = hashtagLine ? wrapText(hashtagLine, CANVAS_WIDTH - PADDING * 2, hashtagFontSize) : [];

  const bg = mode === "gold" ? accent : primary;
  const textColor = mode === "gold" ? primary : "#FFFFFF";
  const hashtagColor = mode === "gold" ? primary : accent;

  const height =
    PADDING +
    ctaLines.length * footerLineGap +
    (hashtagLines.length > 0 ? hashtagLines.length * (hashtagFontSize + 8) + 10 : 0) +
    40;

  const ctaStartY = PADDING + ctaFontSize;
  const hashtagStartY = ctaStartY + ctaLines.length * footerLineGap + hashtagFontSize;

  const backgroundSvg = `
<svg width="${CANVAS_WIDTH}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${CANVAS_WIDTH}" height="${height}" fill="${bg}" />
</svg>`;

  const textItems: TextItem[] = [
    ...linesToItems(ctaLines, PADDING, ctaStartY, footerLineGap, ctaFontSize, 900, textColor),
    ...(hashtagLines.length > 0
      ? linesToItems(hashtagLines, PADDING, hashtagStartY, hashtagFontSize + 8, hashtagFontSize, 700, hashtagColor)
      : []),
  ];

  const background = await sharp(Buffer.from(backgroundSvg)).png().toBuffer();
  const buffer = await withTextLayer(background, CANVAS_WIDTH, height, textItems);
  return { buffer, height };
}

async function assemble(heroBuffer: Buffer, heroHeight: number, highlightsBuffer: Buffer, highlightsHeight: number, footerBuffer: Buffer, footerHeight: number) {
  const totalHeight = heroHeight + highlightsHeight + footerHeight;
  return sharp({
    create: { width: CANVAS_WIDTH, height: totalHeight, channels: 3, background: "#FFFFFF" },
  })
    .composite([
      { input: heroBuffer, top: 0, left: 0 },
      { input: highlightsBuffer, top: heroHeight, left: 0 },
      { input: footerBuffer, top: heroHeight + highlightsHeight, left: 0 },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

// --- Styles 0 / 1 / 2 / 5: text overlaid on the photo -----------------------

async function renderOverlayHero(
  input: Parameters<typeof renderFlyer>[0],
  logoBuffer: Buffer,
  logoHeight: number,
  style: 0 | 1 | 2 | 5,
) {
  const { colorPrimary: primary, colorAccent: accent } = input;
  // Style 5 already reserves the bottom-right corner for its diagonal shape
  // and keeps the headline top-left, so it's excluded from the flip — the
  // other three overlay styles anchor to whichever half of the photo is
  // visually calmer.
  const anchorBottom = input.textZone === "bottom" && style !== 5;

  const headlineFontSize = 62;
  const { lines: headlineLines, fontSize: hFontSize } = fitText(
    input.headline,
    CANVAS_WIDTH - PADDING * 2,
    headlineFontSize,
    3,
  );
  const headlineLineGap = hFontSize + 10;
  const badgeHeight = input.badge ? 56 : 0;

  let badgeTop: number;
  let headlineTop: number;
  if (anchorBottom) {
    const lastLineBaseline = HERO_HEIGHT - 50;
    headlineTop = lastLineBaseline - (headlineLines.length - 1) * headlineLineGap;
    badgeTop = headlineTop - hFontSize * 1.15 - (input.badge ? badgeHeight + 20 : 0);
  } else {
    badgeTop = 40 + logoHeight + 30;
    headlineTop = badgeTop + (input.badge ? badgeHeight + 20 : 0);
  }
  const headlineTextColor = style === 1 ? "#FFFFFF" : primary;

  let scrim: string;
  if (style === 1) {
    const scrimTop = Math.max(0, headlineTop - hFontSize * 1.1);
    // Dark enough right at scrimTop (where the headline text starts) for
    // white text to stay readable, deepening further toward the bottom for
    // a natural vignette rather than fading OUT the coverage where the text
    // actually sits.
    scrim = `<defs>
        <linearGradient id="darkgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="black" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.75"/>
        </linearGradient>
      </defs>
      <rect x="0" y="${scrimTop}" width="${CANVAS_WIDTH}" height="${HERO_HEIGHT - scrimTop}" fill="url(#darkgrad)" />`;
  } else if (anchorBottom) {
    const zoneTop = Math.max(0, (input.badge ? badgeTop : headlineTop - hFontSize * 1.1) - 20);
    scrim = `<defs>
        <linearGradient id="bottomfade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="white" stop-opacity="0"/>
          <stop offset="20%" stop-color="white" stop-opacity="0.82"/>
          <stop offset="100%" stop-color="white" stop-opacity="0.94"/>
        </linearGradient>
      </defs>
      <rect x="0" y="${zoneTop}" width="${CANVAS_WIDTH}" height="${HERO_HEIGHT - zoneTop}" fill="url(#bottomfade)" />`;
  } else {
    const scrimBottom = headlineTop + headlineLines.length * headlineLineGap + 30;
    scrim = `<defs>
        <linearGradient id="topfade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="white" stop-opacity="0.94"/>
          <stop offset="80%" stop-color="white" stop-opacity="0.82"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${CANVAS_WIDTH}" height="${scrimBottom}" fill="url(#topfade)" />`;
  }

  const badgeItems: TextItem[] = [];
  const badgeMarkup = input.badge
    ? `<rect x="${PADDING}" y="${badgeTop}" width="${Math.min(600, 40 + input.badge.length * 20)}" height="${badgeHeight}" rx="28" fill="${accent}" />`
    : "";
  if (input.badge) {
    badgeItems.push({
      text: input.badge.toUpperCase(),
      x: PADDING + 24,
      y: badgeTop + badgeHeight / 2 + 9,
      fontSize: 24,
      fontWeight: 700,
      color: primary,
    });
  }

  let headlineDecorMarkup = "";
  const headlineItems: TextItem[] = [];
  if (style === 0 && headlineLines.length > 0) {
    const otherLines = headlineLines.slice(0, -1);
    const lastLine = headlineLines[headlineLines.length - 1];
    const bandY = headlineTop + (headlineLines.length - 1) * headlineLineGap - hFontSize + 8;
    const bandWidth = Math.min(CANVAS_WIDTH - PADDING * 2, 40 + lastLine.length * (hFontSize * 0.56));
    if (otherLines.length > 0) {
      headlineItems.push(...linesToItems(otherLines, PADDING, headlineTop, headlineLineGap, hFontSize, 900, headlineTextColor));
    }
    headlineDecorMarkup = `
      <rect x="${PADDING - 12}" y="${bandY + 4}" width="${bandWidth}" height="${hFontSize + 16}" rx="8" fill="black" fill-opacity="0.18" />
      <rect x="${PADDING - 16}" y="${bandY}" width="${bandWidth}" height="${hFontSize + 16}" rx="8" fill="${accent}" />
    `;
    headlineItems.push({
      text: lastLine,
      x: PADDING,
      y: headlineTop + (headlineLines.length - 1) * headlineLineGap,
      fontSize: hFontSize,
      fontWeight: 900,
      color: primary,
    });
  } else if (style === 2 && headlineLines.length > 0) {
    const lastLineY = headlineTop + (headlineLines.length - 1) * headlineLineGap;
    const lastLine = headlineLines[headlineLines.length - 1];
    const underlineWidth = Math.min(CANVAS_WIDTH - PADDING * 2, lastLine.length * (hFontSize * 0.56));
    headlineItems.push(...linesToItems(headlineLines, PADDING, headlineTop, headlineLineGap, hFontSize, 900, headlineTextColor));
    headlineDecorMarkup = `<rect x="${PADDING}" y="${lastLineY + 14}" width="${underlineWidth}" height="8" rx="4" fill="${accent}" />`;
  } else {
    // Styles 5 and the plain fallback: headline stays top-left, no extra decor.
    headlineItems.push(...linesToItems(headlineLines, PADDING, headlineTop, headlineLineGap, hFontSize, 900, headlineTextColor));
  }

  const diagonalMarkup =
    style === 5
      ? `<polygon points="${CANVAS_WIDTH * 0.62},${HERO_HEIGHT} ${CANVAS_WIDTH},${HERO_HEIGHT * 0.58} ${CANVAS_WIDTH},${HERO_HEIGHT}" fill="${accent}" fill-opacity="0.92" />`
      : "";
  const logoOnDiagonal = style === 5;

  const heroBackgroundSvg = `
<svg width="${CANVAS_WIDTH}" height="${HERO_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  ${scrim}
  ${diagonalMarkup}
  ${badgeMarkup}
  ${headlineDecorMarkup}
</svg>`;

  const heroWithShapes = await sharp(input.photoBuffer)
    .resize(CANVAS_WIDTH, HERO_HEIGHT, { fit: "cover", position: "attention" })
    .composite([
      { input: Buffer.from(heroBackgroundSvg), top: 0, left: 0 },
      { input: logoBuffer, top: logoOnDiagonal ? HERO_HEIGHT - logoHeight - 32 : 40, left: logoOnDiagonal ? CANVAS_WIDTH - LOGO_WIDTH - 32 : 40 },
    ])
    .png()
    .toBuffer();

  const heroBuffer = await withTextLayer(heroWithShapes, CANVAS_WIDTH, HERO_HEIGHT, [...badgeItems, ...headlineItems]);

  const highlightsVariant = style === 1 ? "tint" : "light";
  const { buffer: highlightsBuffer, height: highlightsHeight } = await buildHighlightsSection(
    input.highlights,
    primary,
    accent,
    highlightsVariant,
  );
  const { buffer: footerBuffer, height: footerHeight } = await buildFooter(
    input.cta,
    input.hashtags,
    primary,
    accent,
    style === 2 ? "gold" : "navy",
  );

  return assemble(heroBuffer, HERO_HEIGHT, highlightsBuffer, highlightsHeight, footerBuffer, footerHeight);
}

// --- Style 3: solid color-block panel on top, clean photo band below -------

async function renderSplitPanel(input: Parameters<typeof renderFlyer>[0], logoBuffer: Buffer, logoHeight: number) {
  const { colorPrimary: primary, colorAccent: accent } = input;
  const photoHeight = 420;
  const headlineFontSize = 54;
  const { lines: headlineLines, fontSize: hFontSize } = fitText(
    input.headline,
    CANVAS_WIDTH - PADDING * 2,
    headlineFontSize,
    3,
  );
  const headlineLineGap = hFontSize + 10;
  const badgeTop = 40 + logoHeight + 26;
  const badgeHeight = input.badge ? 52 : 0;
  const headlineTop = badgeTop + (input.badge ? badgeHeight + 22 : 0) + hFontSize * 0.7;
  // Sized to the actual wrapped headline rather than a fixed height, so a
  // 3-line headline gets room to breathe instead of crowding the accent bar.
  const panelHeight = Math.round(
    Math.max(260, headlineTop + (headlineLines.length - 1) * headlineLineGap + hFontSize * 0.6 + 40),
  );

  const badgeMarkup = input.badge
    ? `<rect x="${PADDING}" y="${badgeTop}" width="${Math.min(560, 36 + input.badge.length * 18)}" height="${badgeHeight}" rx="26" fill="${accent}" />`
    : "";

  const panelBackgroundSvg = `
<svg width="${CANVAS_WIDTH}" height="${panelHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${CANVAS_WIDTH}" height="${panelHeight}" fill="${primary}" />
  <rect x="0" y="${panelHeight - 10}" width="${CANVAS_WIDTH}" height="10" fill="${accent}" />
  ${badgeMarkup}
</svg>`;

  const panelWithShapes = await sharp(Buffer.from(panelBackgroundSvg))
    .composite([{ input: logoBuffer, top: 40, left: 40 }])
    .png()
    .toBuffer();

  const panelTextItems: TextItem[] = [
    ...(input.badge
      ? [{ text: input.badge.toUpperCase(), x: PADDING + 22, y: badgeTop + badgeHeight / 2 + 8, fontSize: 22, fontWeight: 700 as const, color: primary }]
      : []),
    ...linesToItems(headlineLines, PADDING, headlineTop, headlineLineGap, hFontSize, 900, "#FFFFFF"),
  ];
  const panelBuffer = await withTextLayer(panelWithShapes, CANVAS_WIDTH, panelHeight, panelTextItems);

  const photoBuffer = await sharp(input.photoBuffer)
    .resize(CANVAS_WIDTH, photoHeight, { fit: "cover", position: "attention" })
    .png()
    .toBuffer();

  const heroBuffer = await sharp({
    create: { width: CANVAS_WIDTH, height: panelHeight + photoHeight, channels: 3, background: primary },
  })
    .composite([
      { input: panelBuffer, top: 0, left: 0 },
      { input: photoBuffer, top: panelHeight, left: 0 },
    ])
    .png()
    .toBuffer();

  const { buffer: highlightsBuffer, height: highlightsHeight } = await buildHighlightsSection(
    input.highlights,
    primary,
    accent,
    "light",
  );
  const { buffer: footerBuffer, height: footerHeight } = await buildFooter(input.cta, input.hashtags, primary, accent, "navy");

  return assemble(heroBuffer, panelHeight + photoHeight, highlightsBuffer, highlightsHeight, footerBuffer, footerHeight);
}

// --- Style 4: framed/inset photo card, headline below on a light band ------

async function renderFramedCard(input: Parameters<typeof renderFlyer>[0], logoBuffer: Buffer) {
  const { colorPrimary: primary, colorAccent: accent } = input;
  const frameMargin = 36;
  const photoHeight = 520;
  const headlineFontSize = 50;
  const headlineBandHeight = 200;
  const { lines: headlineLines, fontSize: hFontSize } = fitText(
    input.headline,
    CANVAS_WIDTH - PADDING * 2,
    headlineFontSize,
    2,
  );
  const headlineLineGap = hFontSize + 8;

  const framedPhoto = await sharp(input.photoBuffer)
    .resize(CANVAS_WIDTH - frameMargin * 2, photoHeight - frameMargin * 2, { fit: "cover", position: "attention" })
    .toBuffer();

  const cardSvg = `
<svg width="${CANVAS_WIDTH}" height="${photoHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${CANVAS_WIDTH}" height="${photoHeight}" fill="${primary}" />
</svg>`;

  const roundedMask = `<svg width="${CANVAS_WIDTH - frameMargin * 2}" height="${photoHeight - frameMargin * 2}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="white"/></svg>`;
  const roundedPhoto = await sharp(framedPhoto)
    .ensureAlpha()
    .composite([{ input: Buffer.from(roundedMask), blend: "dest-in" }])
    .png()
    .toBuffer();

  const ribbonMarkup = input.badge
    ? `<polygon points="${CANVAS_WIDTH - 210},0 ${CANVAS_WIDTH},0 ${CANVAS_WIDTH},60" fill="${accent}" />`
    : "";

  const heroWithShapes = await sharp(Buffer.from(cardSvg))
    .composite([
      { input: roundedPhoto, top: frameMargin, left: frameMargin },
      { input: logoBuffer, top: frameMargin + 24, left: frameMargin + 24 },
      {
        input: Buffer.from(`<svg width="${CANVAS_WIDTH}" height="60" xmlns="http://www.w3.org/2000/svg">${ribbonMarkup}</svg>`),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  const ribbonTextItems: TextItem[] = input.badge
    ? [{ text: input.badge.toUpperCase(), x: CANVAS_WIDTH - 30, y: 38, fontSize: 20, fontWeight: 700, color: primary, align: "right" }]
    : [];
  const heroBuffer = await withTextLayer(heroWithShapes, CANVAS_WIDTH, photoHeight, ribbonTextItems);

  const headlineBandBackgroundSvg = `
<svg width="${CANVAS_WIDTH}" height="${headlineBandHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${CANVAS_WIDTH}" height="${headlineBandHeight}" fill="#FFFFFF" />
  <rect x="${PADDING}" y="30" width="64" height="6" rx="3" fill="${accent}" />
</svg>`;
  const headlineBandBackground = await sharp(Buffer.from(headlineBandBackgroundSvg)).png().toBuffer();
  const headlineBandBuffer = await withTextLayer(
    headlineBandBackground,
    CANVAS_WIDTH,
    headlineBandHeight,
    linesToItems(headlineLines, PADDING, 90, headlineLineGap, hFontSize, 900, primary),
  );

  const heroWithBand = await sharp({
    create: { width: CANVAS_WIDTH, height: photoHeight + headlineBandHeight, channels: 3, background: "#FFFFFF" },
  })
    .composite([
      { input: heroBuffer, top: 0, left: 0 },
      { input: headlineBandBuffer, top: photoHeight, left: 0 },
    ])
    .png()
    .toBuffer();

  const { buffer: highlightsBuffer, height: highlightsHeight } = await buildHighlightsSection(
    input.highlights,
    primary,
    accent,
    "light",
  );
  const { buffer: footerBuffer, height: footerHeight } = await buildFooter(input.cta, input.hashtags, primary, accent, "navy");

  return assemble(
    heroWithBand,
    photoHeight + headlineBandHeight,
    highlightsBuffer,
    highlightsHeight,
    footerBuffer,
    footerHeight,
  );
}
