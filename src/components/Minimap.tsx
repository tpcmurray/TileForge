import { useRef, useEffect, useCallback } from 'react'
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

  // Offscreen canvas caches the cell-color image (rebuilt only on cells/tiles change)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  // Track which cells version the offscreen was built from
  const offscreenCellsRef = useRef<string[][] | null>(null)
  const offscreenTilesRef = useRef<Map<string, unknown> | null>(null)

  const mapWidth = useStore((s) => s.mapWidth)
  const mapHeight = useStore((s) => s.mapHeight)

  const scale = (() => {
    const rawW = mapWidth * MINI_CELL_W
    const rawH = mapHeight * MINI_CELL_H
    if (rawW <= MAX_W && rawH <= MAX_H) return 1
    return Math.min(MAX_W / rawW, MAX_H / rawH)
  })()

  const miniW = Math.ceil(mapWidth * MINI_CELL_W * scale)
  const miniH = Math.ceil(mapHeight * MINI_CELL_H * scale)
  const cellW = MINI_CELL_W * scale
  const cellH = MINI_CELL_H * scale

  // Build (or rebuild) the offscreen cell-color canvas via ImageData
  const rebuildOffscreen = useCallback(() => {
    if (mapWidth === 0 || mapHeight === 0) return

    const s = useStore.getState()
    offscreenCellsRef.current = s.cells
    offscreenTilesRef.current = s.tiles

    const pw = Math.ceil(mapWidth * cellW)
    const ph = Math.ceil(mapHeight * cellH)

    let oc = offscreenRef.current
    if (!oc || oc.width !== pw || oc.height !== ph) {
      oc = document.createElement('canvas')
      oc.width = pw
      oc.height = ph
      offscreenRef.current = oc
    }

    const ctx = oc.getContext('2d')!
    const imgData = ctx.createImageData(pw, ph)
    const data = imgData.data
    const fr = 13, fg = 15, fb = 18 // --bg-darkest fallback

    for (let r = 0; r < mapHeight; r++) {
      const row = s.cells[r]
      const py0 = Math.floor(r * cellH)
      const py1 = Math.floor((r + 1) * cellH)
      for (let c = 0; c < mapWidth; c++) {
        const code = row?.[c]
        const tile = code ? s.tiles.get(code) : null
        let cr: number, cg: number, cb: number
        if (tile && tile.bg.a > 0) {
          cr = tile.bg.r; cg = tile.bg.g; cb = tile.bg.b
        } else {
          cr = fr; cg = fg; cb = fb
        }
        const px0 = Math.floor(c * cellW)
        const px1 = Math.floor((c + 1) * cellW)
        for (let py = py0; py < py1; py++) {
          const rowOff = py * pw
          for (let px = px0; px < px1; px++) {
            const i = (rowOff + px) << 2
            data[i] = cr
            data[i + 1] = cg
            data[i + 2] = cb
            data[i + 3] = 255
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0)
  }, [mapWidth, mapHeight, cellW, cellH])

  // Composite: draw cached offscreen + viewport rect onto visible canvas
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    const oc = offscreenRef.current
    if (!canvas || !oc || miniW === 0 || miniH === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Blit cached cell image
    ctx.clearRect(0, 0, miniW, miniH)
    ctx.drawImage(oc, 0, 0, miniW, miniH)

    // Draw viewport rectangle
    const s = useStore.getState()
    const realCellW = BASE_CELL_W * s.zoom
    const realCellH = BASE_CELL_H * s.zoom
    const vx = (-s.panX / realCellW) * cellW
    const vy = (-s.panY / realCellH) * cellH
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
  }, [miniW, miniH, cellW, cellH, containerWidth, containerHeight])

  // Subscribe to store — rebuild offscreen only when cells/tiles change, always redraw frame
  useEffect(() => {
    if (mapWidth === 0 || mapHeight === 0) return

    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = miniW
    canvas.height = miniH

    // Initial build
    rebuildOffscreen()
    drawFrame()

    let pending = false
    const schedule = () => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        pending = false

        // Check if cells or tiles changed since last offscreen build
        const s = useStore.getState()
        if (s.cells !== offscreenCellsRef.current || s.tiles !== offscreenTilesRef.current) {
          rebuildOffscreen()
        }

        drawFrame()
      })
    }

    const unsub = useStore.subscribe(schedule)
    return () => unsub()
  }, [mapWidth, mapHeight, miniW, miniH, rebuildOffscreen, drawFrame])

  const panToMinimapPoint = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const col = mx / cellW
      const row = my / cellH

      const s = useStore.getState()
      const realCellW = BASE_CELL_W * s.zoom
      const realCellH = BASE_CELL_H * s.zoom
      s.setPan(
        -col * realCellW + containerWidth / 2,
        -row * realCellH + containerHeight / 2,
      )
    },
    [cellW, cellH, containerWidth, containerHeight],
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
