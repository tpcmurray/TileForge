import type { RGBA } from '../types'

/** Convert an RGBA object to a CSS rgba() string (cached) */
const cssCache = new Map<number, string>()

export function rgbaToCSS(c: RGBA): string {
  // Pack RGBA into a single 32-bit key
  const key = (c.r << 24) | (c.g << 16) | (c.b << 8) | c.a
  let s = cssCache.get(key)
  if (s === undefined) {
    s = `rgba(${c.r},${c.g},${c.b},${c.a / 255})`
    cssCache.set(key, s)
  }
  return s
}

/** Checkerboard pattern size (in pixels) */
const CHECK_SIZE = 8

/**
 * Draw a checkerboard pattern (indicates transparency) into a cell rect.
 */
export function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  checkSize: number = CHECK_SIZE,
): void {
  const light = '#444444'
  const dark = '#333333'
  for (let cy = 0; cy < h; cy += checkSize) {
    for (let cx = 0; cx < w; cx += checkSize) {
      const isLight = ((Math.floor(cx / checkSize) + Math.floor(cy / checkSize)) % 2) === 0
      ctx.fillStyle = isLight ? light : dark
      ctx.fillRect(
        x + cx,
        y + cy,
        Math.min(checkSize, w - cx),
        Math.min(checkSize, h - cy),
      )
    }
  }
}
