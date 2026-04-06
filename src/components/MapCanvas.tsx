import { useRef, useEffect, useCallback, useState } from 'react'
import { useStore } from '../store'
import { buildAtlas } from '../rendering/atlas'
import { renderMap } from '../rendering/renderer'
import { useEntityTool } from '../hooks/useEntityTool'
import { EntityEditDialog } from './EntityEditDialog'
import { Minimap } from './Minimap'
import type { Entity } from '../types'

/** Base cell size in pixels at zoom 1.0 (1:2 ratio matching 8×16 characters) */
const BASE_CELL_W = 16
const BASE_CELL_H = 32

export function MapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const isPainting = useRef(false)
  const isSelecting = useRef(false)
  const selStart = useRef({ x: 0, y: 0 })
  const paintedCells = useRef<Set<string>>(new Set())
  const strokeChanges = useRef<{ x: number; y: number; before: string; after: string }[]>([])

  const [pastePreview, setPastePreview] = useState<{ x: number; y: number } | null>(null)
  const [pasteMode, setPasteMode] = useState(false)
  const [editingEntity, setEditingEntity] = useState<{ entity: Entity | null; defaultPos?: { x: number; y: number } } | null>(null)

  // Only subscribe to values needed for JSX rendering
  const activeTool = useStore((s) => s.activeTool)
  const zoom = useStore((s) => s.zoom)
  const mapWidth = useStore((s) => s.mapWidth)
  const mapHeight = useStore((s) => s.mapHeight)
  const showMinimap = useStore((s) => s.showMinimap)
  const clipboard = useStore((s) => s.clipboard)

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

  // Render loop: reads store directly to avoid re-creating draw on every state change
  const rafRef = useRef(0)

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

    const s = useStore.getState()

    renderMap(ctx, {
      cells: s.cells,
      tiles: s.tiles,
      mapWidth: s.mapWidth,
      mapHeight: s.mapHeight,
      cellW: BASE_CELL_W * s.zoom,
      cellH: BASE_CELL_H * s.zoom,
      panX: s.panX,
      panY: s.panY,
      showGrid: s.showGrid,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
      selection: s.selection,
      clipboard: (pasteMode || s.activeTool === 'paste') ? s.clipboard : null,
      pastePreview: (pasteMode || s.activeTool === 'paste') ? pastePreview : null,
      playerOverlayPos: s.playerOverlay ? s.playerOverlayPos : null,
      entities: s.activeTool === 'entity' ? s.entities : undefined,
      showEntities: s.activeTool === 'entity',
      selectedEntityId: s.selectedEntityId,
    })
  }, [pasteMode, pastePreview])

  useEffect(() => {
    // Subscribe to store changes and schedule a single rAF per frame
    let pending = false
    const schedule = () => {
      if (pending) return
      pending = true
      rafRef.current = requestAnimationFrame(() => {
        pending = false
        draw()
      })
    }

    // Initial draw
    schedule()

    // Re-draw on any store change
    const unsub = useStore.subscribe(schedule)

    return () => {
      unsub()
      cancelAnimationFrame(rafRef.current)
    }
  }, [draw])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver(() => {
      draw()
      const r = container.getBoundingClientRect()
      setContainerSize({ w: r.width, h: r.height })
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [draw])

  /** Convert mouse event to grid cell coordinates */
  const mouseToCell = useCallback(
    (e: React.MouseEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const s = useStore.getState()
      const rect = canvas.getBoundingClientRect()
      const cw = BASE_CELL_W * s.zoom
      const ch = BASE_CELL_H * s.zoom
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const col = Math.floor((mx - s.panX) / cw)
      const row = Math.floor((my - s.panY) / ch)
      if (col < 0 || col >= s.mapWidth || row < 0 || row >= s.mapHeight) return null
      return { x: col, y: row }
    },
    [],
  )

  const openEditDialog = useCallback((entity: Entity | null, defaultPos?: { x: number; y: number }) => {
    setEditingEntity({ entity, defaultPos })
  }, [])

  const entityTool = useEntityTool(mouseToCell, openEditDialog)

  const applyTool = useCallback(
    (cell: { x: number; y: number }) => {
      const s = useStore.getState()
      const key = `${cell.x},${cell.y}`
      if (s.activeTool === 'paint') {
        // Quick Paint: materialize tile on first cell of stroke
        if (s.onBeforePaint) s.onBeforePaint()
        const tileCode = s.activeTileCode
        if (!tileCode) return
        if (paintedCells.current.has(key)) return
        paintedCells.current.add(key)
        const before = s.cells[cell.y]?.[cell.x] ?? '..'
        if (before !== tileCode) {
          strokeChanges.current.push({ x: cell.x, y: cell.y, before, after: tileCode })
          s.setCell(cell.x, cell.y, tileCode)
        }
      } else if (s.activeTool === 'erase') {
        if (paintedCells.current.has(key)) return
        paintedCells.current.add(key)
        const before = s.cells[cell.y]?.[cell.x] ?? '..'
        const eraseCode = '..'
        if (before !== eraseCode) {
          strokeChanges.current.push({ x: cell.x, y: cell.y, before, after: eraseCode })
          s.setCell(cell.x, cell.y, eraseCode)
        }
      } else if (s.activeTool === 'pick') {
        const code = s.cells[cell.y]?.[cell.x]
        if (code) {
          s.setActiveTile(code)
          s.setTool('paint')
        }
      }
    },
    [],
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
        const s = useStore.getState()
        const code = s.cells[cell.y]?.[cell.x]
        if (code && s.tiles.has(code)) {
          s.setActiveTile(code)
          s.setTool('paint')
        }
        return
      }

      if (e.button !== 0) return

      const s = useStore.getState()

      // Entity tool: delegate to entity handler
      if (s.activeTool === 'entity') {
        entityTool.handleMouseDown(e)
        return
      }

      const cell = mouseToCell(e)
      if (!cell) return

      // Alt+click: place player overlay
      if (e.altKey && s.playerOverlay) {
        s.setPlayerOverlayPos({ x: cell.x, y: cell.y })
        return
      }

      // Paste tool / paste mode: click to stamp
      if ((s.activeTool === 'paste' || pasteMode) && s.clipboard) {
        s.paste(cell.x, cell.y)
        // Stay in paste mode — user can keep clicking to paste more
        return
      }

      // Copy tool: start selection drag
      if (s.activeTool === 'copy') {
        isSelecting.current = true
        selStart.current = { x: cell.x, y: cell.y }
        s.setSelection({ x: cell.x, y: cell.y, w: 1, h: 1 })
        return
      }

      // Shift+click: start selection
      if (e.shiftKey) {
        isSelecting.current = true
        selStart.current = { x: cell.x, y: cell.y }
        s.setSelection({ x: cell.x, y: cell.y, w: 1, h: 1 })
        return
      }

      // Normal click: paint/erase/pick
      s.setSelection(null)
      isPainting.current = true
      paintedCells.current.clear()
      strokeChanges.current = []
      applyTool(cell)
    },
    [mouseToCell, applyTool, pasteMode, entityTool],
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
        const s = useStore.getState()
        s.setPan(s.panX + dx, s.panY + dy)
        lastMouse.current = { x: e.clientX, y: e.clientY }
        return
      }

      const s = useStore.getState()

      // Entity tool drag
      if (s.activeTool === 'entity') {
        entityTool.handleMouseMove(e)
        return
      }

      // Update paste preview position
      if ((s.activeTool === 'paste' || pasteMode) && cell) {
        setPastePreview(cell)
      }

      // Dragging selection
      if (isSelecting.current && cell) {
        const sx = Math.min(selStart.current.x, cell.x)
        const sy = Math.min(selStart.current.y, cell.y)
        const ex = Math.max(selStart.current.x, cell.x)
        const ey = Math.max(selStart.current.y, cell.y)
        s.setSelection({ x: sx, y: sy, w: ex - sx + 1, h: ey - sy + 1 })
        return
      }

      if (isPainting.current && cell) {
        applyTool(cell)
      }
    },
    [mouseToCell, applyTool, pasteMode, entityTool],
  )

  const handleMouseUp = useCallback(() => {
    const s = useStore.getState()
    if (s.activeTool === 'entity') {
      entityTool.handleMouseUp()
    }
    if (isPanning.current) {
      isPanning.current = false
      return
    }
    if (isSelecting.current) {
      isSelecting.current = false
      if (s.activeTool === 'copy') {
        s.copySelection()
      }
      return
    }
    if (isPainting.current) {
      isPainting.current = false
      if (strokeChanges.current.length > 0) {
        s.pushOperation({
          description: s.activeTool === 'paint' ? 'Paint' : 'Erase',
          changes: strokeChanges.current,
        })
      }
      paintedCells.current.clear()
      strokeChanges.current = []
    }
  }, [entityTool])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const s = useStore.getState()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.25, Math.min(4, s.zoom + delta))

      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const scale = newZoom / s.zoom
        s.setPan(mx - (mx - s.panX) * scale, my - (my - s.panY) * scale)
      }

      s.setZoom(newZoom)
    },
    [],
  )

  const hasMap = mapWidth > 0 && mapHeight > 0

  const cursor = (pasteMode || activeTool === 'paste')
    ? 'copy'
    : activeTool === 'copy'
      ? 'crosshair'
      : activeTool === 'pick'
        ? 'crosshair'
        : activeTool === 'entity'
          ? 'pointer'
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
          onDoubleClick={activeTool === 'entity' ? entityTool.handleDoubleClick : undefined}
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

      {/* Minimap */}
      {hasMap && showMinimap && (
        <Minimap containerWidth={containerSize.w} containerHeight={containerSize.h} />
      )}

      {/* Paste mode hint */}
      {(pasteMode || (activeTool === 'paste' && clipboard)) && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 font-mono text-[11px] px-3.5 py-1.5 rounded-full"
          style={{
            color: 'var(--text-dim)',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
          }}
        >
          Click to paste{pasteMode ? ' · Esc to cancel' : ''}
        </div>
      )}
      {/* Copy mode hint */}
      {activeTool === 'copy' && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 font-mono text-[11px] px-3.5 py-1.5 rounded-full"
          style={{
            color: 'var(--text-dim)',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
          }}
        >
          Drag to select region{clipboard ? ' · Selection copied' : ''}
        </div>
      )}

      {/* Entity edit dialog */}
      {editingEntity && (
        <EntityEditDialog
          entity={editingEntity.entity}
          defaultPos={editingEntity.defaultPos}
          onClose={() => setEditingEntity(null)}
        />
      )}
    </div>
  )
}
