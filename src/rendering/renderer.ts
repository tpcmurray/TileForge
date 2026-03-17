import type { TileDefinition, Selection } from '../types'
import { drawGlyph } from './atlas'
import { rgbaToCSS, drawCheckerboard } from './tinting'

export interface RenderOptions {
  cells: string[][]
  tiles: Map<string, TileDefinition>
  mapWidth: number
  mapHeight: number
  cellW: number
  cellH: number
  panX: number
  panY: number
  showGrid: boolean
  canvasWidth: number
  canvasHeight: number
  selection?: Selection | null
  clipboard?: string[][] | null
  pastePreview?: { x: number; y: number } | null
}

/** Deterministic hash for stable random variant selection per cell */
function cellRand(col: number, row: number): number {
  return Math.abs((col * 7919 + row * 104729 + col * row * 31) % 100)
}

/** Pick which glyph to draw for a tile at a given cell position */
function pickGlyph(tile: TileDefinition, col: number, row: number): number {
  if (!tile.variants || tile.variants.length === 0) return tile.glyph
  const rand = cellRand(col, row)
  let cumulative = 0
  for (const v of tile.variants) {
    cumulative += v.percent
    if (rand < cumulative) return v.glyph
  }
  return tile.glyph
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
    cellW, cellH, panX, panY, showGrid,
    canvasWidth, canvasHeight,
    selection, clipboard, pastePreview,
  } = opts

  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  if (mapWidth === 0 || mapHeight === 0) return

  // Visible cell range
  const startCol = Math.max(0, Math.floor(-panX / cellW))
  const startRow = Math.max(0, Math.floor(-panY / cellH))
  const endCol = Math.min(mapWidth, Math.ceil((canvasWidth - panX) / cellW))
  const endRow = Math.min(mapHeight, Math.ceil((canvasHeight - panY) / cellH))

  // Draw cells
  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const x = panX + col * cellW
      const y = panY + row * cellH
      const code = cells[row]?.[col]
      const tile = code ? tiles.get(code) : undefined

      if (tile) {
        if (tile.bg.a === 0) {
          drawCheckerboard(ctx, x, y, cellW, cellH)
        } else {
          ctx.fillStyle = rgbaToCSS(tile.bg)
          ctx.fillRect(x, y, cellW, cellH)
        }
        const g = pickGlyph(tile, col, row)
        if (g > 0) {
          drawGlyph(ctx, g, x, y, cellW, cellH, rgbaToCSS(tile.fg))
        }
      } else {
        ctx.fillStyle = '#ff00ff'
        ctx.fillRect(x, y, cellW, cellH)
        ctx.fillStyle = '#ffffff'
        ctx.font = `${Math.max(8, cellH * 0.6)}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('?', x + cellW / 2, y + cellH / 2)
      }
    }
  }

  // Grid lines
  if (showGrid) {
    ctx.strokeStyle = 'rgba(46, 52, 80, 0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let col = startCol; col <= endCol; col++) {
      const x = Math.round(panX + col * cellW) + 0.5
      ctx.moveTo(x, panY + startRow * cellH)
      ctx.lineTo(x, panY + endRow * cellH)
    }
    for (let row = startRow; row <= endRow; row++) {
      const y = Math.round(panY + row * cellH) + 0.5
      ctx.moveTo(panX + startCol * cellW, y)
      ctx.lineTo(panX + endCol * cellW, y)
    }
    ctx.stroke()
  }

  // Selection overlay
  if (selection && selection.w > 0 && selection.h > 0) {
    const sx = panX + selection.x * cellW
    const sy = panY + selection.y * cellH
    const sw = selection.w * cellW
    const sh = selection.h * cellH

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
        const x = panX + cx * cellW
        const y = panY + cy * cellH
        const code = clipboard[dy][dx]
        const tile = tiles.get(code)
        if (tile) {
          ctx.fillStyle = rgbaToCSS(tile.bg)
          ctx.fillRect(x, y, cellW, cellH)
          const g = pickGlyph(tile, cx, cy)
          if (g > 0) {
            drawGlyph(ctx, g, x, y, cellW, cellH, rgbaToCSS(tile.fg))
          }
        }
      }
    }
    ctx.globalAlpha = 1.0

    // Outline around paste region
    const gx = panX + px * cellW
    const gy = panY + py * cellH
    const gw = clipboard[0].length * cellW
    const gh = clipboard.length * cellH
    ctx.strokeStyle = 'rgba(255, 170, 51, 0.8)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(gx, gy, gw, gh)
    ctx.setLineDash([])
  }
}
