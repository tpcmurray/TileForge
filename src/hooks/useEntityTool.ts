import { useRef, useCallback } from 'react'
import { useStore } from '../store'
import type { Entity } from '../types'

/** Find entities whose bounding box covers the given cell */
function entitiesAtCell(entities: Entity[], cx: number, cy: number): Entity[] {
  return entities.filter((e) => {
    if (e.type === 'CRITTER') {
      const x1 = Math.min(e.x, e.x2), x2 = Math.max(e.x, e.x2)
      const y1 = Math.min(e.y, e.y2), y2 = Math.max(e.y, e.y2)
      return cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2
    }
    const ew = 'w' in e ? (e as { w: number }).w : 1
    const eh = 'h' in e ? (e as { h: number }).h : 1
    return cx >= e.x && cx < e.x + ew && cy >= e.y && cy < e.y + eh
  })
}

export function useEntityTool(
  mouseToCell: (e: React.MouseEvent) => { x: number; y: number } | null,
  openEditDialog: (entity: Entity | null, defaultPos?: { x: number; y: number }) => void,
) {
  const dragging = useRef(false)
  const dragEntityId = useRef<string | null>(null)
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragEntityStart = useRef<{ x: number; y: number; x2?: number; y2?: number }>({ x: 0, y: 0 })
  const clickCycleIndex = useRef(0)
  const lastClickCell = useRef<string>('')

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const cell = mouseToCell(e)
      if (!cell) return

      const { entities, selectedEntityId } = useStore.getState()
      const hits = entitiesAtCell(entities, cell.x, cell.y)

      if (hits.length === 0) {
        // Click on empty — deselect
        useStore.getState().setSelectedEntity(null)
        return
      }

      // Cycle through entities at same cell
      const cellKey = `${cell.x},${cell.y}`
      if (cellKey === lastClickCell.current) {
        clickCycleIndex.current = (clickCycleIndex.current + 1) % hits.length
      } else {
        clickCycleIndex.current = 0
        lastClickCell.current = cellKey
      }

      const target = hits[clickCycleIndex.current]
      useStore.getState().setSelectedEntity(target.id)

      // Start drag
      if (selectedEntityId === target.id) {
        dragging.current = true
        dragEntityId.current = target.id
        dragStart.current = { x: cell.x, y: cell.y }
        dragEntityStart.current = target.type === 'CRITTER'
          ? { x: target.x, y: target.y, x2: target.x2, y2: target.y2 }
          : { x: target.x, y: target.y }
      }
    },
    [mouseToCell],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging.current || !dragEntityId.current) return
      const cell = mouseToCell(e)
      if (!cell) return

      const dx = cell.x - dragStart.current.x
      const dy = cell.y - dragStart.current.y
      const newX = dragEntityStart.current.x + dx
      const newY = dragEntityStart.current.y + dy
      const start = dragEntityStart.current

      // Live preview: update entity position without pushing undo
      const { entities } = useStore.getState()
      const updated = entities.map((ent) => {
        if (ent.id !== dragEntityId.current) return ent
        if (ent.type === 'CRITTER' && start.x2 != null && start.y2 != null) {
          return { ...ent, x: newX, y: newY, x2: start.x2 + dx, y2: start.y2 + dy }
        }
        return { ...ent, x: newX, y: newY }
      })
      useStore.setState({ entities: updated })
    },
    [mouseToCell],
  )

  const handleMouseUp = useCallback(() => {
    if (!dragging.current || !dragEntityId.current) {
      dragging.current = false
      return
    }

    const id = dragEntityId.current
    const { entities } = useStore.getState()
    const entity = entities.find((e) => e.id === id)
    const start = dragEntityStart.current

    if (entity && (entity.x !== start.x || entity.y !== start.y)) {
      if (entity.type === 'CRITTER' && start.x2 != null && start.y2 != null) {
        // Revert both corners, then apply final state via updateEntity for undo tracking
        const final = { ...entity }
        const reverted = entities.map((e) =>
          e.id === id ? { ...e, x: start.x, y: start.y, x2: start.x2, y2: start.y2 } as Entity : e,
        )
        useStore.setState({ entities: reverted })
        useStore.getState().updateEntity(id, final)
      } else {
        // Revert to original, then use moveEntity for proper undo tracking
        const reverted = entities.map((e) =>
          e.id === id ? { ...e, x: start.x, y: start.y } : e,
        )
        useStore.setState({ entities: reverted })
        useStore.getState().moveEntity(id, entity.x, entity.y)
      }
    }

    dragging.current = false
    dragEntityId.current = null
  }, [])

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const cell = mouseToCell(e)
      if (!cell) return

      const { entities } = useStore.getState()
      const hits = entitiesAtCell(entities, cell.x, cell.y)

      if (hits.length > 0) {
        openEditDialog(hits[0])
      } else {
        openEditDialog(null, { x: cell.x, y: cell.y })
      }
    },
    [mouseToCell, openEditDialog],
  )

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
  }
}
