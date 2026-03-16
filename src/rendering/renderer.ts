import type { TileDefinition, Selection } from '../types'
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
  selection?: Selection | null
  clipboard?: string[][] | null
  pastePreview?: { x: number; y: number } | null
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
    selection, clipboard, pastePreview,
  } = opts

  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  if (mapWidth === 0 || mapHeight === 0) return

  // Visible cell range
  const startCol = Math.max(0, Math.floor(-panX / cellSize))
  const startRow = Math.max(0, Math.floor(-panY / cellSize))
  const endCol = Math.min(mapWidth, Math.ceil((canvasWidth - panX) / cellSize))
  const endRow = Math.min(mapHeight, Math.ceil((canvasHeight - panY) / cellSize))

  // Draw cells
  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const x = panX + col * cellSize
      const y = panY + row * cellSize
      const code = cells[row]?.[col]
      const tile = code ? tiles.get(code) : undefined

      if (tile) {
        if (tile.bg.a === 0) {
          drawCheckerboard(ctx, x, y, cellSize, cellSize)
        } else {
          ctx.fillStyle = rgbaToCSS(tile.bg)
          ctx.fillRect(x, y, cellSize, cellSize)
        }
        if (tile.glyph > 0) {
          drawGlyph(ctx, tile.glyph, x, y, cellSize, cellSize, rgbaToCSS(tile.fg))
        }
      } else {
        ctx.fillStyle = '#ff00ff'
        ctx.fillRect(x, y, cellSize, cellSize)
        ctx.fillStyle = '#ffffff'
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

  // Selection overlay
  if (selection && selection.w > 0 && selection.h > 0) {
    const sx = panX + selection.x * cellSize
    const sy = panY + selection.y * cellSize
    const sw = selection.w * cellSize
    const sh = selection.h * cellSize

    ctx.fillStyle = 'rgba(74, 158, 255, 0.12)'
    ctx.fillRect(sx, sy, sw, sh)

    ctx.strokeStyle = 'rgba(74, 158, 255, 0.8)'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(sx, sy, sw, sh)
    ctx.setLineDash([])
  }

  // Paste ghost preview
  if (clipboard && pastePreview) {
    const { x: px, y: py } = pastePreview
    ctx.globalAlpha = 0.5
    for (let dy = 0; dy < clipboard.length; dy++) {
      for (let dx = 0; dx < clipboard[dy].length; dx++) {
        const cx = px + dx
        const cy = py + dy
        if (cx < 0 || cx >= mapWidth || cy < 0 || cy >= mapHeight) continue
        const x = panX + cx * cellSize
        const y = panY + cy * cellSize
        const code = clipboard[dy][dx]
        const tile = tiles.get(code)
        if (tile) {
          ctx.fillStyle = rgbaToCSS(tile.bg)
          ctx.fillRect(x, y, cellSize, cellSize)
          if (tile.glyph > 0) {
            drawGlyph(ctx, tile.glyph, x, y, cellSize, cellSize, rgbaToCSS(tile.fg))
          }
        }
      }
    }
    ctx.globalAlpha = 1.0

    // Outline around paste region
    const gx = panX + px * cellSize
    const gy = panY + py * cellSize
    const gw = clipboard[0].length * cellSize
    const gh = clipboard.length * cellSize
    ctx.strokeStyle = 'rgba(255, 170, 51, 0.8)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(gx, gy, gw, gh)
    ctx.setLineDash([])
  }
}
