import type { RGBA } from '../types'

/** Convert an RGBA object to a CSS rgba() string */
export function rgbaToCSS(c: RGBA): string {
  return `rgba(${c.r},${c.g},${c.b},${c.a / 255})`
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
): void {
  const light = '#444444'
  const dark = '#333333'
  for (let cy = 0; cy < h; cy += CHECK_SIZE) {
    for (let cx = 0; cx < w; cx += CHECK_SIZE) {
      const isLight = ((Math.floor(cx / CHECK_SIZE) + Math.floor(cy / CHECK_SIZE)) % 2) === 0
      ctx.fillStyle = isLight ? light : dark
      ctx.fillRect(
        x + cx,
        y + cy,
        Math.min(CHECK_SIZE, w - cx),
        Math.min(CHECK_SIZE, h - cy),
      )
    }
  }
}
