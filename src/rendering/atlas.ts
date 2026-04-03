import { cp437ToUnicode } from '../utils/cp437'

/** The cell size used for glyph rendering (1:2 ratio matching CP437 characters) */
export const CELL_W = 16
export const CELL_H = 32

/** 16×16 grid = 256 glyphs */
const ATLAS_COLS = 16
const ATLAS_ROWS = 16

let atlasCanvas: OffscreenCanvas | null = null
let atlasReady = false

type BlockDraw = (ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void

/** CP437 block/shade characters drawn as geometric fills for pixel-perfect rendering */
const BLOCK_GLYPHS: Record<number, BlockDraw> = {
  // 176 ░ Light Shade
  0xB0: (ctx, x, y, w, h) => {
    for (let py = 0; py < h; py += 2)
      for (let px = (py % 4 === 0 ? 0 : 1); px < w; px += 2)
        ctx.fillRect(x + px, y + py, 1, 1)
  },
  // 177 ▒ Medium Shade
  0xB1: (ctx, x, y, w, h) => {
    for (let py = 0; py < h; py++)
      for (let px = (py % 2 === 0 ? 0 : 1); px < w; px += 2)
        ctx.fillRect(x + px, y + py, 1, 1)
  },
  // 178 ▓ Dark Shade
  0xB2: (ctx, x, y, w, h) => {
    ctx.fillRect(x, y, w, h)
    ctx.clearRect(x, y, 0, 0) // no-op to keep consistent
    for (let py = 0; py < h; py += 2)
      for (let px = (py % 4 === 0 ? 0 : 1); px < w; px += 2)
        ctx.clearRect(x + px, y + py, 1, 1)
  },
  // 219 █ Full Block
  0xDB: (ctx, x, y, w, h) => { ctx.fillRect(x, y, w, h) },
  // 220 ▄ Lower Half Block
  0xDC: (ctx, x, y, w, h) => { ctx.fillRect(x, y + Math.floor(h / 2), w, Math.ceil(h / 2)) },
  // 221 ▌ Left Half Block
  0xDD: (ctx, x, y, w, h) => { ctx.fillRect(x, y, Math.floor(w / 2), h) },
  // 222 ▐ Right Half Block
  0xDE: (ctx, x, y, w, h) => { ctx.fillRect(x + Math.floor(w / 2), y, Math.ceil(w / 2), h) },
  // 223 ▀ Upper Half Block
  0xDF: (ctx, x, y, w, h) => { ctx.fillRect(x, y, w, Math.floor(h / 2)) },
}

/**
 * Build the CP437 font atlas on an offscreen canvas.
 * Each glyph is rendered as white-on-transparent at CELL_W × CELL_H.
 * Call once at startup; subsequent calls are no-ops.
 */
export function buildAtlas(): void {
  if (atlasReady) return

  const width = ATLAS_COLS * CELL_W
  const height = ATLAS_ROWS * CELL_H
  atlasCanvas = new OffscreenCanvas(width, height)
  const ctx = atlasCanvas.getContext('2d')!

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // Use a monospace font sized to fit the 8×16 cell; browsers will fall back
  ctx.font = `${CELL_H - 2}px "Courier New", "Consolas", monospace`

  for (let i = 0; i < 256; i++) {
    const col = i % ATLAS_COLS
    const row = Math.floor(i / ATLAS_COLS)
    const cx = col * CELL_W
    const cy = row * CELL_H

    // Skip null character (index 0) and nbsp (index 255)
    if (i === 0 || i === 255) continue

    // Block/shade characters: draw as geometric fills for pixel-perfect edges
    const block = BLOCK_GLYPHS[i]
    if (block) {
      block(ctx, cx, cy, CELL_W, CELL_H)
      continue
    }

    const ch = cp437ToUnicode(i)
    ctx.fillText(ch, cx + CELL_W / 2, cy + CELL_H / 2)
  }

  atlasReady = true
}

/** Get the atlas canvas. Builds it if not yet ready. */
export function getAtlas(): OffscreenCanvas {
  if (!atlasCanvas) buildAtlas()
  return atlasCanvas!
}

/** Returns true if the atlas has been built */
export function isAtlasReady(): boolean {
  return atlasReady
}

// Cache tinted glyphs: key = `${glyphIndex}:${fgColor}`
const tintCache = new Map<string, OffscreenCanvas>()
const MAX_CACHE = 2048

/**
 * Draw a single glyph from the atlas onto a target context,
 * tinted to the given foreground color.
 */
export function drawGlyph(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  glyphIndex: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  fgColor: string,
): void {
  const cacheKey = `${glyphIndex}:${fgColor}`
  let tinted = tintCache.get(cacheKey)

  if (!tinted) {
    const atlas = getAtlas()
    const col = glyphIndex % ATLAS_COLS
    const row = Math.floor(glyphIndex / ATLAS_COLS)
    const sx = col * CELL_W
    const sy = row * CELL_H

    tinted = new OffscreenCanvas(CELL_W, CELL_H)
    const tintCtx = tinted.getContext('2d')!
    tintCtx.clearRect(0, 0, CELL_W, CELL_H)
    tintCtx.drawImage(atlas, sx, sy, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H)
    tintCtx.globalCompositeOperation = 'source-atop'
    tintCtx.fillStyle = fgColor
    tintCtx.fillRect(0, 0, CELL_W, CELL_H)

    if (tintCache.size >= MAX_CACHE) tintCache.clear()
    tintCache.set(cacheKey, tinted)
  }

  ctx.drawImage(tinted, 0, 0, CELL_W, CELL_H, dx, dy, dw, dh)
}
