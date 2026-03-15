import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { buildAtlas } from '../rendering/atlas'
import { renderMap } from '../rendering/renderer'

/** Base cell size in pixels at zoom 1.0 */
const BASE_CELL = 24

export function MapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const isPainting = useRef(false)
  const paintedCells = useRef<Set<string>>(new Set())
  const strokeChanges = useRef<{ x: number; y: number; before: string; after: string }[]>([])

  const {
    cells, tiles, mapWidth, mapHeight,
    zoom, panX, panY, showGrid,
    setZoom, setPan,
    activeTool, activeTileCode,
    setCell, setActiveTile, setTool,
    pushOperation,
  } = useStore()

  // Build atlas once
  useEffect(() => { buildAtlas() }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    renderMap(ctx, {
      cells,
      tiles,
      mapWidth,
      mapHeight,
      cellSize: BASE_CELL * zoom,
      panX,
      panY,
      showGrid,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
    })
  }, [cells, tiles, mapWidth, mapHeight, zoom, panX, panY, showGrid])

  useEffect(() => {
    const id = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(id)
  }, [draw])

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver(() => draw())
    obs.observe(container)
    return () => obs.disconnect()
  }, [draw])

  /** Convert mouse event to grid cell coordinates */
  const mouseToCell = useCallback(
    (e: React.MouseEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const cellSize = BASE_CELL * zoom
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const col = Math.floor((mx - panX) / cellSize)
      const row = Math.floor((my - panY) / cellSize)
      if (col < 0 || col >= mapWidth || row < 0 || row >= mapHeight) return null
      return { x: col, y: row }
    },
    [zoom, panX, panY, mapWidth, mapHeight],
  )

  const applyTool = useCallback(
    (cell: { x: number; y: number }) => {
      const key = `${cell.x},${cell.y}`
      if (activeTool === 'paint' && activeTileCode) {
        if (paintedCells.current.has(key)) return
        paintedCells.current.add(key)
        const before = cells[cell.y]?.[cell.x] ?? '..'
        if (before !== activeTileCode) {
          strokeChanges.current.push({ x: cell.x, y: cell.y, before, after: activeTileCode })
          setCell(cell.x, cell.y, activeTileCode)
        }
      } else if (activeTool === 'erase') {
        if (paintedCells.current.has(key)) return
        paintedCells.current.add(key)
        const before = cells[cell.y]?.[cell.x] ?? '..'
        const eraseCode = '..'
        if (before !== eraseCode) {
          strokeChanges.current.push({ x: cell.x, y: cell.y, before, after: eraseCode })
          setCell(cell.x, cell.y, eraseCode)
        }
      } else if (activeTool === 'pick') {
        const code = cells[cell.y]?.[cell.x]
        if (code) {
          setActiveTile(code)
          setTool('paint')
        }
      }
    },
    [activeTool, activeTileCode, cells, setCell, setActiveTile, setTool],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle-click or space+click: start pan
      if (e.button === 1) {
        isPanning.current = true
        lastMouse.current = { x: e.clientX, y: e.clientY }
        e.preventDefault()
        return
      }

      // Left-click: use tool
      if (e.button === 0) {
        const cell = mouseToCell(e)
        if (cell) {
          isPainting.current = true
          paintedCells.current.clear()
          strokeChanges.current = []
          applyTool(cell)
        }
      }
    },
    [mouseToCell, applyTool],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update cursor position in store for status bar
      const cell = mouseToCell(e)
      useStore.setState({
        _cursorX: cell?.x ?? -1,
        _cursorY: cell?.y ?? -1,
      } as Record<string, number>)

      if (isPanning.current) {
        const dx = e.clientX - lastMouse.current.x
        const dy = e.clientY - lastMouse.current.y
        setPan(panX + dx, panY + dy)
        lastMouse.current = { x: e.clientX, y: e.clientY }
        return
      }

      if (isPainting.current) {
        if (cell) applyTool(cell)
      }
    },
    [mouseToCell, panX, panY, setPan, applyTool],
  )

  const handleMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false
      return
    }
    if (isPainting.current) {
      isPainting.current = false
      if (strokeChanges.current.length > 0) {
        pushOperation({
          description: activeTool === 'paint' ? 'Paint' : 'Erase',
          changes: strokeChanges.current,
        })
      }
      paintedCells.current.clear()
      strokeChanges.current = []
    }
  }, [activeTool, pushOperation])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.25, Math.min(4, zoom + delta))

      // Zoom toward mouse cursor
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const scale = newZoom / zoom
        const newPanX = mx - (mx - panX) * scale
        const newPanY = my - (my - panY) * scale
        setPan(newPanX, newPanY)
      }

      setZoom(newZoom)
    },
    [zoom, panX, panY, setZoom, setPan],
  )

  const hasMap = mapWidth > 0 && mapHeight > 0

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{ background: 'var(--bg-darkest)' }}
    >
      {hasMap ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: activeTool === 'pick' ? 'crosshair' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div
            className="text-sm font-mono text-center leading-6"
            style={{ color: 'var(--text-dim)' }}
          >
            No map loaded<br />
            Use File → New Map or File → Open Map
          </div>
        </div>
      )}

      {/* Zoom indicator */}
      {hasMap && (
        <div
          className="absolute bottom-3 right-3 font-mono text-[11px] px-2.5 py-1 rounded"
          style={{
            color: 'var(--text-dim)',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
          }}
        >
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  )
}
