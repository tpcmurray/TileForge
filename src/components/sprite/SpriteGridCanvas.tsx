import { useRef, useEffect, useCallback } from 'react'
import type { SpriteCell } from '../../types/sprite'
import { rgbaToCSS, drawCheckerboard } from '../../rendering/tinting'

interface Props {
  grid: SpriteCell[][]
  width: number
  height: number
  cellW?: number
  cellH?: number
  selectedCell: { row: number; col: number } | null
  onCellClick: (row: number, col: number) => void
  onCellPaint: (row: number, col: number) => void
  onCellRightClick: (row: number, col: number, cell: SpriteCell) => void
  label?: string
}

export function SpriteGridCanvas({
  grid,
  width,
  height,
  cellW = 16,
  cellH = 32,
  selectedCell,
  onCellClick,
  onCellPaint,
  onCellRightClick,
  label,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragging = useRef(false)

  const canvasW = width * cellW
  const canvasH = height * cellH

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    canvas.width = canvasW * dpr
    canvas.height = canvasH * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.clearRect(0, 0, canvasW, canvasH)

    const fontSize = Math.max(10, cellH * 0.65)
    ctx.font = `${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const cell = grid[r]?.[c]
        if (!cell) continue
        const x = c * cellW
        const y = r * cellH

        // Background
        if (cell.bg.a === 0) {
          drawCheckerboard(ctx, x, y, cellW, cellH, Math.max(2, Math.floor(cellW / 4)))
        } else {
          ctx.fillStyle = rgbaToCSS(cell.bg)
          ctx.fillRect(x, y, cellW, cellH)
        }

        // Glyph
        if (cell.glyph && cell.glyph !== ' ') {
          ctx.fillStyle = rgbaToCSS(cell.fg)
          ctx.fillText(cell.glyph, x + cellW / 2, y + cellH / 2)
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let c = 0; c <= width; c++) {
      const x = c * cellW + 0.5
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasH)
    }
    for (let r = 0; r <= height; r++) {
      const y = r * cellH + 0.5
      ctx.moveTo(0, y)
      ctx.lineTo(canvasW, y)
    }
    ctx.stroke()

    // Selected cell highlight
    if (selectedCell) {
      const sx = selectedCell.col * cellW
      const sy = selectedCell.row * cellH
      ctx.strokeStyle = 'var(--accent, #4a9eff)'
      ctx.lineWidth = 2
      ctx.strokeRect(sx + 1, sy + 1, cellW - 2, cellH - 2)
    }
  }, [grid, width, height, cellW, cellH, selectedCell, canvasW, canvasH])

  useEffect(() => {
    draw()
  }, [draw])

  const cellFromEvent = useCallback(
    (e: React.MouseEvent): { row: number; col: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const scaleX = canvasW / rect.width
      const scaleY = canvasH / rect.height
      const col = Math.floor((x * scaleX) / cellW)
      const row = Math.floor((y * scaleY) / cellH)
      if (col < 0 || col >= width || row < 0 || row >= height) return null
      return { row, col }
    },
    [cellW, cellH, width, height, canvasW, canvasH],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const pos = cellFromEvent(e)
      if (!pos) return
      dragging.current = true
      onCellClick(pos.row, pos.col)
    },
    [cellFromEvent, onCellClick],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging.current) return
      const pos = cellFromEvent(e)
      if (!pos) return
      onCellPaint(pos.row, pos.col)
    },
    [cellFromEvent, onCellPaint],
  )

  const handleMouseUp = useCallback(() => {
    dragging.current = false
  }, [])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const pos = cellFromEvent(e)
      if (!pos) return
      const cell = grid[pos.row]?.[pos.col]
      if (cell) onCellRightClick(pos.row, pos.col, cell)
    },
    [cellFromEvent, grid, onCellRightClick],
  )

  return (
    <div className="inline-block">
      {label && (
        <div
          className="text-[10px] font-mono font-semibold uppercase tracking-wide mb-1"
          style={{ color: 'var(--accent)' }}
        >
          {label}
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: canvasW,
          height: canvasH,
          cursor: 'crosshair',
          border: '1px solid var(--border)',
          borderRadius: 4,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
    </div>
  )
}
