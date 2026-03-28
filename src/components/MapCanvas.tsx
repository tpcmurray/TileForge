import { useRef, useEffect, useCallback, useState } from 'react'
import { useStore } from '../store'
import { buildAtlas } from '../rendering/atlas'
import { renderMap } from '../rendering/renderer'

/** Base cell size in pixels at zoom 1.0 (1:2 ratio matching 8×16 characters) */
const BASE_CELL_W = 16
const BASE_CELL_H = 32

export function MapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const isPainting = useRef(false)
  const isSelecting = useRef(false)
  const selStart = useRef({ x: 0, y: 0 })
  const paintedCells = useRef<Set<string>>(new Set())
  const strokeChanges = useRef<{ x: number; y: number; before: string; after: string }[]>([])

  const [pastePreview, setPastePreview] = useState<{ x: number; y: number } | null>(null)
  const [pasteMode, setPasteMode] = useState(false)

  const {
    cells, tiles, mapWidth, mapHeight,
    zoom, panX, panY, showGrid,
    setZoom, setPan,
    activeTool,
    setCell, setActiveTile, setTool,
    pushOperation,
    selection, setSelection, clipboard,
    playerOverlay, playerOverlayPos, setPlayerOverlayPos,
  } = useStore()

  // Build atlas once
  useEffect(() => { buildAtlas() }, [])

  // Listen for paste mode activation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'c') {
        e.preventDefault()
        useStore.getState().copySelection()
        return
      }
      if (ctrl && e.key === 'v') {
        e.preventDefault()
        if (useStore.getState().clipboard) {
          setPasteMode(true)
        }
        return
      }
      if (e.key === 'Escape' && pasteMode) {
        setPasteMode(false)
        setPastePreview(null)
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pasteMode])

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
      cellW: BASE_CELL_W * zoom,
      cellH: BASE_CELL_H * zoom,
      panX,
      panY,
      showGrid,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
      selection,
      clipboard: pasteMode ? clipboard : null,
      pastePreview: pasteMode ? pastePreview : null,
      playerOverlayPos: playerOverlay ? playerOverlayPos : null,
    })
  }, [cells, tiles, mapWidth, mapHeight, zoom, panX, panY, showGrid, selection, clipboard, pasteMode, pastePreview, playerOverlay, playerOverlayPos])

  useEffect(() => {
    const id = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(id)
  }, [draw])

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
      const cw = BASE_CELL_W * zoom
      const ch = BASE_CELL_H * zoom
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const col = Math.floor((mx - panX) / cw)
      const row = Math.floor((my - panY) / ch)
      if (col < 0 || col >= mapWidth || row < 0 || row >= mapHeight) return null
      return { x: col, y: row }
    },
    [zoom, panX, panY, mapWidth, mapHeight],
  )

  const applyTool = useCallback(
    (cell: { x: number; y: number }) => {
      const key = `${cell.x},${cell.y}`
      if (activeTool === 'paint') {
        // Quick Paint: materialize tile on first cell of stroke
        const beforePaint = useStore.getState().onBeforePaint
        if (beforePaint) beforePaint()
        const tileCode = useStore.getState().activeTileCode
        if (!tileCode) return
        if (paintedCells.current.has(key)) return
        paintedCells.current.add(key)
        const before = cells[cell.y]?.[cell.x] ?? '..'
        if (before !== tileCode) {
          strokeChanges.current.push({ x: cell.x, y: cell.y, before, after: tileCode })
          setCell(cell.x, cell.y, tileCode)
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
    [activeTool, cells, setCell, setActiveTile, setTool],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle-click: pan
      if (e.button === 1) {
        isPanning.current = true
        lastMouse.current = { x: e.clientX, y: e.clientY }
        e.preventDefault()
        return
      }

      // Right-click: pick tile under cursor
      if (e.button === 2) {
        const cell = mouseToCell(e)
        if (!cell) return
        const { cells: currentCells } = useStore.getState()
        const code = currentCells[cell.y]?.[cell.x]
        if (code) {
          const tiles = useStore.getState().tiles
          if (tiles.has(code)) {
            useStore.getState().setActiveTile(code)
            useStore.getState().setTool('paint')
          }
        }
        return
      }

      if (e.button !== 0) return
      const cell = mouseToCell(e)
      if (!cell) return

      // Alt+click: place player overlay
      if (e.altKey && useStore.getState().playerOverlay) {
        useStore.getState().setPlayerOverlayPos({ x: cell.x, y: cell.y })
        return
      }

      // Paste mode: click to stamp
      if (pasteMode && clipboard) {
        useStore.getState().paste(cell.x, cell.y)
        setPasteMode(false)
        setPastePreview(null)
        return
      }

      // Shift+click: start selection
      if (e.shiftKey) {
        isSelecting.current = true
        selStart.current = { x: cell.x, y: cell.y }
        setSelection({ x: cell.x, y: cell.y, w: 1, h: 1 })
        return
      }

      // Normal click: paint/erase/pick
      setSelection(null)
      isPainting.current = true
      paintedCells.current.clear()
      strokeChanges.current = []
      applyTool(cell)
    },
    [mouseToCell, applyTool, pasteMode, clipboard, setSelection],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
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

      // Update paste preview position
      if (pasteMode && cell) {
        setPastePreview(cell)
      }

      // Dragging selection
      if (isSelecting.current && cell) {
        const sx = Math.min(selStart.current.x, cell.x)
        const sy = Math.min(selStart.current.y, cell.y)
        const ex = Math.max(selStart.current.x, cell.x)
        const ey = Math.max(selStart.current.y, cell.y)
        setSelection({ x: sx, y: sy, w: ex - sx + 1, h: ey - sy + 1 })
        return
      }

      if (isPainting.current && cell) {
        applyTool(cell)
      }
    },
    [mouseToCell, panX, panY, setPan, applyTool, pasteMode, setSelection],
  )

  const handleMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false
      return
    }
    if (isSelecting.current) {
      isSelecting.current = false
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

      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const scale = newZoom / zoom
        setPan(mx - (mx - panX) * scale, my - (my - panY) * scale)
      }

      setZoom(newZoom)
    },
    [zoom, panX, panY, setZoom, setPan],
  )

  const hasMap = mapWidth > 0 && mapHeight > 0

  const cursor = pasteMode
    ? 'copy'
    : activeTool === 'pick'
      ? 'crosshair'
      : 'default'

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{ background: 'var(--bg-darkest)' }}
    >
      {hasMap ? (
        <canvas
          ref={canvasRef}
          data-map=""
          className="absolute inset-0 w-full h-full"
          style={{ cursor }}
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

      {/* Paste mode hint */}
      {pasteMode && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 font-mono text-[11px] px-3.5 py-1.5 rounded-full"
          style={{
            color: 'var(--text-dim)',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
          }}
        >
          Click to paste · Esc to cancel
        </div>
      )}
    </div>
  )
}
