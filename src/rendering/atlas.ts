import { cp437ToUnicode } from '../utils/cp437'

/** The cell size used for glyph rendering */
export const CELL_W = 16
export const CELL_H = 16

/** 16×16 grid = 256 glyphs */
const ATLAS_COLS = 16
const ATLAS_ROWS = 16

let atlasCanvas: OffscreenCanvas | null = null
let atlasReady = false

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
  // Use a monospace font; browsers will fall back if not available
  ctx.font = `${CELL_H - 2}px "Courier New", "Consolas", monospace`

  for (let i = 0; i < 256; i++) {
    const col = i % ATLAS_COLS
    const row = Math.floor(i / ATLAS_COLS)
    const x = col * CELL_W + CELL_W / 2
    const y = row * CELL_H + CELL_H / 2
    const ch = cp437ToUnicode(i)
    // Skip null character (index 0) and nbsp (index 255)
    if (i === 0 || i === 255) continue
    ctx.fillText(ch, x, y)
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
