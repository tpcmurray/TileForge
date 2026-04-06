import { useRef, useEffect, useCallback, useMemo } from 'react'
import { useStore } from '../store'

const BASE_CELL_W = 16
const BASE_CELL_H = 32
const MINI_CELL_W = 2
const MINI_CELL_H = 4
const MAX_W = 400
const MAX_H = 300

interface Props {
  containerWidth: number
  containerHeight: number
}

export function Minimap({ containerWidth, containerHeight }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const draggingRef = useRef(false)

  const cells = useStore((s) => s.cells)
  const tiles = useStore((s) => s.tiles)
  const mapWidth = useStore((s) => s.mapWidth)
  const mapHeight = useStore((s) => s.mapHeight)
  const zoom = useStore((s) => s.zoom)
  const panX = useStore((s) => s.panX)
  const panY = useStore((s) => s.panY)
  const setPan = useStore((s) => s.setPan)

  // Compute scale factor to fit within max dimensions
  const scale = useMemo(() => {
    const rawW = mapWidth * MINI_CELL_W
    const rawH = mapHeight * MINI_CELL_H
    if (rawW <= MAX_W && rawH <= MAX_H) return 1
    return Math.min(MAX_W / rawW, MAX_H / rawH)
  }, [mapWidth, mapHeight])

  const miniW = Math.ceil(mapWidth * MINI_CELL_W * scale)
  const miniH = Math.ceil(mapHeight * MINI_CELL_H * scale)

  const cellW = MINI_CELL_W * scale
  const cellH = MINI_CELL_H * scale

  // Cache cell colors — only recompute when cells or tiles change
  const colorBuffer = useMemo(() => {
    const buf = new Uint8Array(mapWidth * mapHeight * 3)
    const fallback = [13, 15, 18] // --bg-darkest approx
    for (let r = 0; r < mapHeight; r++) {
      for (let c = 0; c < mapWidth; c++) {
        const code = cells[r]?.[c]
        const tile = code ? tiles.get(code) : null
        const idx = (r * mapWidth + c) * 3
        if (tile && tile.bg.a > 0) {
          buf[idx] = tile.bg.r
          buf[idx + 1] = tile.bg.g
          buf[idx + 2] = tile.bg.b
        } else {
          buf[idx] = fallback[0]
          buf[idx + 1] = fallback[1]
          buf[idx + 2] = fallback[2]
        }
      }
    }
    return buf
  }, [cells, tiles, mapWidth, mapHeight])

  // Render minimap
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || miniW === 0 || miniH === 0) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = miniW * dpr
    canvas.height = miniH * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(dpr, dpr)

    // Draw cell colors
    for (let r = 0; r < mapHeight; r++) {
      for (let c = 0; c < mapWidth; c++) {
        const idx = (r * mapWidth + c) * 3
        ctx.fillStyle = `rgb(${colorBuffer[idx]},${colorBuffer[idx + 1]},${colorBuffer[idx + 2]})`
        ctx.fillRect(c * cellW, r * cellH, Math.ceil(cellW), Math.ceil(cellH))
      }
    }

    // Draw viewport rectangle
    const realCellW = BASE_CELL_W * zoom
    const realCellH = BASE_CELL_H * zoom
    const vx = (-panX / realCellW) * cellW
    const vy = (-panY / realCellH) * cellH
    const vw = (containerWidth / realCellW) * cellW
    const vh = (containerHeight / realCellH) * cellH

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.lineWidth = 1
    ctx.strokeRect(
      Math.max(0, vx) + 0.5,
      Math.max(0, vy) + 0.5,
      Math.min(vw, miniW - Math.max(0, vx)),
      Math.min(vh, miniH - Math.max(0, vy)),
    )
  }, [colorBuffer, miniW, miniH, cellW, cellH, mapWidth, mapHeight, zoom, panX, panY, containerWidth, containerHeight])

  const panToMinimapPoint = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      // Map pixel to cell
      const col = mx / cellW
      const row = my / cellH

      // Center that cell in the main view
      const realCellW = BASE_CELL_W * zoom
      const realCellH = BASE_CELL_H * zoom
      setPan(
        -col * realCellW + containerWidth / 2,
        -row * realCellH + containerHeight / 2,
      )
    },
    [cellW, cellH, zoom, containerWidth, containerHeight, setPan],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      draggingRef.current = true
      panToMinimapPoint(e)
    },
    [panToMinimapPoint],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingRef.current) return
      e.preventDefault()
      e.stopPropagation()
      panToMinimapPoint(e)
    },
    [panToMinimapPoint],
  )

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  // Release drag if mouse leaves minimap
  useEffect(() => {
    const up = () => { draggingRef.current = false }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  if (mapWidth === 0 || mapHeight === 0) return null

  return (
    <div
      className="absolute bottom-3 left-3 rounded"
      style={{
        border: '1px solid var(--border-light)',
        background: 'var(--bg-dark)',
        lineHeight: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: miniW, height: miniH, cursor: 'crosshair', display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  )
}
