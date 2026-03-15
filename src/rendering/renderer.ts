import type { TileDefinition } from '../types'
import { drawGlyph } from './atlas'
import { rgbaToCSS, drawCheckerboard } from './tinting'

export interface RenderOptions {
  cells: string[][]
  tiles: Map<string, TileDefinition>
  mapWidth: number
  mapHeight: number
  cellSize: number
  panX: number
  panY: number
  showGrid: boolean
  canvasWidth: number
  canvasHeight: number
}

/**
 * Render the full map to a canvas context.
 * Only draws cells visible within the viewport for performance.
 */
export function renderMap(
  ctx: CanvasRenderingContext2D,
  opts: RenderOptions,
): void {
  const {
    cells, tiles, mapWidth, mapHeight,
    cellSize, panX, panY, showGrid,
    canvasWidth, canvasHeight,
  } = opts

  // Clear
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  if (mapWidth === 0 || mapHeight === 0) return

  // Calculate visible cell range
  const startCol = Math.max(0, Math.floor(-panX / cellSize))
  const startRow = Math.max(0, Math.floor(-panY / cellSize))
  const endCol = Math.min(mapWidth, Math.ceil((canvasWidth - panX) / cellSize))
  const endRow = Math.min(mapHeight, Math.ceil((canvasHeight - panY) / cellSize))

  // Error marker for unknown tiles
  const errorBg = '#ff00ff'
  const errorFg = '#ffffff'

  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const x = panX + col * cellSize
      const y = panY + row * cellSize
      const code = cells[row]?.[col]
      const tile = code ? tiles.get(code) : undefined

      if (tile) {
        // Background
        if (tile.bg.a === 0) {
          drawCheckerboard(ctx, x, y, cellSize, cellSize)
        } else {
          ctx.fillStyle = rgbaToCSS(tile.bg)
          ctx.fillRect(x, y, cellSize, cellSize)
        }

        // Foreground glyph
        if (tile.glyph > 0) {
          drawGlyph(ctx, tile.glyph, x, y, cellSize, cellSize, rgbaToCSS(tile.fg))
        }
      } else {
        // Error marker for unknown code
        ctx.fillStyle = errorBg
        ctx.fillRect(x, y, cellSize, cellSize)
        ctx.fillStyle = errorFg
        ctx.font = `${Math.max(8, cellSize * 0.6)}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('?', x + cellSize / 2, y + cellSize / 2)
      }
    }
  }

  // Grid lines
  if (showGrid) {
    ctx.strokeStyle = 'rgba(46, 52, 80, 0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let col = startCol; col <= endCol; col++) {
      const x = Math.round(panX + col * cellSize) + 0.5
      ctx.moveTo(x, panY + startRow * cellSize)
      ctx.lineTo(x, panY + endRow * cellSize)
    }
    for (let row = startRow; row <= endRow; row++) {
      const y = Math.round(panY + row * cellSize) + 0.5
      ctx.moveTo(panX + startCol * cellSize, y)
      ctx.lineTo(panX + endCol * cellSize, y)
    }
    ctx.stroke()
  }
}
