import { useEffect } from 'react'
import { useStore } from '../store'
import { serializeTerrain } from '../io/terrainFile'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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

      // Ctrl+S — Save map (reuses file handle if available)
      if (ctrl && e.key === 's') {
        e.preventDefault()
        const { cells, mapFileHandle } = useStore.getState()
        if (cells.length === 0) return
        const text = serializeTerrain(cells)
        if (mapFileHandle) {
          mapFileHandle.createWritable().then(async (w) => {
            await w.write(text)
            await w.close()
            useStore.setState({ mapDirty: false })
          })
        } else {
          window.showSaveFilePicker({
            suggestedName: 'map.terrain',
            types: [{ description: 'Terrain files', accept: { 'text/plain': ['.terrain'] } }],
          }).then(async (handle) => {
            const w = await handle.createWritable()
            await w.write(text)
            await w.close()
            useStore.getState().setMapFileHandle(handle)
            useStore.setState({ mapDirty: false })
          }).catch(() => {})
        }
        return
      }

      // Ctrl+N — New map
      if (ctrl && e.key === 'n') {
        e.preventDefault()
        const w = prompt('Map width (cells):', '30')
        const h = prompt('Map height (cells):', '20')
        if (w && h) {
          const width = parseInt(w)
          const height = parseInt(h)
          if (width > 0 && height > 0) {
            useStore.getState().clearMap(width, height, '..')
          }
        }
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

      // Escape — clear selection / cancel paste mode
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
