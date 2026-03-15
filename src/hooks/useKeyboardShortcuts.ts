import { useEffect } from 'react'
import { useStore } from '../store'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey

      // Ctrl+Z — Undo
      if (ctrl && !shift && e.key === 'z') {
        e.preventDefault()
        useStore.getState().undo()
        return
      }

      // Ctrl+Shift+Z — Redo
      if (ctrl && shift && e.key === 'Z') {
        e.preventDefault()
        useStore.getState().redo()
        return
      }

      // G — Toggle grid
      if (!ctrl && e.key.toLowerCase() === 'g') {
        useStore.getState().toggleGrid()
        return
      }

      // +/= — Zoom in
      if (!ctrl && (e.key === '+' || e.key === '=')) {
        const s = useStore.getState()
        s.setZoom(s.zoom + 0.1)
        return
      }

      // - — Zoom out
      if (!ctrl && e.key === '-') {
        const s = useStore.getState()
        s.setZoom(s.zoom - 0.1)
        return
      }

      // Escape — clear selection
      if (e.key === 'Escape') {
        useStore.getState().setSelection(null)
        return
      }

      // Delete — clear selected cells
      if (e.key === 'Delete') {
        const s = useStore.getState()
        if (s.selection) {
          const changes: { x: number; y: number; before: string; after: string }[] = []
          const updates: { x: number; y: number; code: string }[] = []
          for (let dy = 0; dy < s.selection.h; dy++) {
            for (let dx = 0; dx < s.selection.w; dx++) {
              const x = s.selection.x + dx
              const y = s.selection.y + dy
              const before = s.cells[y]?.[x] ?? '..'
              if (before !== '..') {
                changes.push({ x, y, before, after: '..' })
                updates.push({ x, y, code: '..' })
              }
            }
          }
          if (updates.length > 0) {
            s.setCellRange(updates)
            s.pushOperation({ description: 'Delete selection', changes })
          }
          s.setSelection(null)
        }
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
