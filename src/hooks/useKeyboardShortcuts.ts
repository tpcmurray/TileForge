import { useEffect } from 'react'
import { useStore } from '../store'
import { serializeTerrain } from '../io/terrainFile'
import { serializeEntities } from '../io/entitiesFile'
import { serializeRegistry } from '../io/registryFile'
import { serializeSpriteFile } from '../io/spriteFile'
import { serializeDialogFile } from '../io/dialogFile'
import { serializeCutsceneFile } from '../io/cutsceneFile'

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

      // Ctrl+Shift+S — Save All (map + entities + registry)
      if (ctrl && shift && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveAllFiles()
        return
      }

      // Ctrl+S — Save (context-dependent)
      if (ctrl && e.key === 's') {
        e.preventDefault()
        const s = useStore.getState()

        // Sprites mode: save sprite file
        if (s.editorMode === 'sprites') {
          if (s.sprites.length > 0) {
            const text = serializeSpriteFile(s.sprites)
            if (s.spriteFileHandle) {
              s.spriteFileHandle.createWritable().then(async (w) => {
                await w.write(text)
                await w.close()
                useStore.setState({ spritesDirty: false })
              })
            } else {
              (window as any).showSaveFilePicker({
                suggestedName: 'sprites.json',
                types: [{ description: 'Sprite JSON', accept: { 'application/json': ['.json'] } }],
              }).then(async (handle: FileSystemFileHandle) => {
                const w = await handle.createWritable()
                await w.write(text)
                await w.close()
                useStore.getState().setSpriteFileHandle(handle)
                useStore.setState({ spritesDirty: false })
              }).catch(() => {})
            }
          }
          return
        }

        // Dialogs mode: save dialog file
        if (s.editorMode === 'dialogs') {
          if (s.dialogTrees.length > 0) {
            const text = serializeDialogFile(s.dialogTrees)
            if (s.dialogFileHandle) {
              s.dialogFileHandle.createWritable().then(async (w) => {
                await w.write(text)
                await w.close()
                useStore.setState({ dialogsDirty: false })
              })
            } else {
              (window as any).showSaveFilePicker({
                suggestedName: 'dialogues.json',
                types: [{ description: 'Dialog JSON', accept: { 'application/json': ['.json'] } }],
              }).then(async (handle: FileSystemFileHandle) => {
                const w = await handle.createWritable()
                await w.write(text)
                await w.close()
                useStore.getState().setDialogFileHandle(handle)
                useStore.setState({ dialogsDirty: false })
              }).catch(() => {})
            }
          }
          return
        }

        // Cutscenes mode: save cutscene file
        if (s.editorMode === 'cutscenes') {
          if (s.cutscenes.length > 0) {
            const text = serializeCutsceneFile(s.cutscenes)
            if (s.cutsceneFileHandle) {
              s.cutsceneFileHandle.createWritable().then(async (w) => {
                await w.write(text)
                await w.close()
                useStore.setState({ cutscenesDirty: false })
              })
            } else {
              (window as any).showSaveFilePicker({
                suggestedName: 'cutscenes.json',
                types: [{ description: 'Cutscene JSON', accept: { 'application/json': ['.json'] } }],
              }).then(async (handle: FileSystemFileHandle) => {
                const w = await handle.createWritable()
                await w.write(text)
                await w.close()
                useStore.getState().setCutsceneFileHandle(handle)
                useStore.setState({ cutscenesDirty: false })
              }).catch(() => {})
            }
          }
          return
        }

        // Map mode: save map + entities
        if (s.cells.length > 0) {
          const text = serializeTerrain(s.cells)
          if (s.mapFileHandle) {
            s.mapFileHandle.createWritable().then(async (w) => {
              await w.write(text)
              await w.close()
              useStore.setState({ mapDirty: false })
            })
          } else {
            (window as any).showSaveFilePicker({
              suggestedName: 'map.terrain',
              types: [{ description: 'Terrain files', accept: { 'text/plain': ['.terrain'] } }],
            }).then(async (handle: FileSystemFileHandle) => {
              const w = await handle.createWritable()
              await w.write(text)
              await w.close()
              useStore.getState().setMapFileHandle(handle)
              useStore.setState({ mapDirty: false })
            }).catch(() => {})
          }
        }
        // Save entities if dirty
        if (s.entitiesDirty && s.entitiesFileHandle) {
          const eText = serializeEntities(s.entities, s.entityComments, s.entityUnknownLines)
          s.entitiesFileHandle.createWritable().then(async (w) => {
            await w.write(eText)
            await w.close()
            useStore.setState({ entitiesDirty: false })
          })
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

      // ── NPC mode shortcuts ──
      if (useStore.getState().editorMode === 'sprites') {
        const ns = useStore.getState()

        // Escape — deselect NPC cell
        if (e.key === 'Escape') {
          ns.setSpriteSelectedCell(null)
          return
        }

        // Arrow keys — move selected cell
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && ns.spriteSelectedCell) {
          e.preventDefault()
          const { target, row, col } = ns.spriteSelectedCell
          const npc = ns.sprites.find((n) => n.id === ns.selectedSpriteId)
          const grid = target === 'portrait'
            ? npc?.portrait
            : npc?.sprite[target]
          if (!grid) return
          let nr = row, nc = col
          if (e.key === 'ArrowUp') nr = Math.max(0, row - 1)
          if (e.key === 'ArrowDown') nr = Math.min(grid.height - 1, row + 1)
          if (e.key === 'ArrowLeft') nc = Math.max(0, col - 1)
          if (e.key === 'ArrowRight') nc = Math.min(grid.width - 1, col + 1)
          ns.setSpriteSelectedCell({ target, row: nr, col: nc })
          return
        }

        // G/F/B — switch paint mode
        if (e.key.toLowerCase() === 'g' && !ctrl) { ns.setSpritePaintMode('glyph'); return }
        if (e.key.toLowerCase() === 'f' && !ctrl) { ns.setSpritePaintMode('fg'); return }
        if (e.key.toLowerCase() === 'b' && !ctrl) { ns.setSpritePaintMode('bg'); return }

        // Typing a character in glyph mode — set current glyph
        if (ns.spritePaintMode === 'glyph' && e.key.length === 1 && !ctrl) {
          ns.setSpriteCurrentGlyph(e.key)
          // Also paint the selected cell if one is selected
          if (ns.spriteSelectedCell && ns.selectedSpriteId) {
            const { target, row, col } = ns.spriteSelectedCell
            const storeTarget = target === 'portrait' ? 'portrait' as const : 'sprite' as const
            const state = target === 'portrait' ? null : target
            ns.setSpriteCell(storeTarget, state, row, col, { glyph: e.key })
          }
          return
        }

        return // Don't fall through to map shortcuts in NPC mode
      }

      // Escape — clear selection / cancel paste mode
      if (e.key === 'Escape') {
        useStore.getState().setSelection(null)
        return
      }

      // Delete — delete selected entity or clear selected cells
      if (e.key === 'Delete') {
        const s = useStore.getState()
        if (s.activeTool === 'entity' && s.selectedEntityId) {
          s.deleteEntity(s.selectedEntityId)
          return
        }
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

async function saveAllFiles() {
  const s = useStore.getState()

  // Save map
  if (s.cells.length > 0) {
    const text = serializeTerrain(s.cells)
    if (s.mapFileHandle) {
      const w = await s.mapFileHandle.createWritable()
      await w.write(text)
      await w.close()
    } else {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'map.terrain',
          types: [{ description: 'Terrain files', accept: { 'text/plain': ['.terrain'] } }],
        })
        const w = await handle.createWritable()
        await w.write(text)
        await w.close()
        useStore.getState().setMapFileHandle(handle)
      } catch { /* cancelled */ }
    }
    useStore.setState({ mapDirty: false })
  }

  // Save entities
  if (s.entities.length > 0 || s.entityComments.length > 0) {
    const eText = serializeEntities(s.entities, s.entityComments, s.entityUnknownLines)
    if (s.entitiesFileHandle) {
      const w = await s.entitiesFileHandle.createWritable()
      await w.write(eText)
      await w.close()
    } else {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'map.entities',
          types: [{ description: 'Entities files', accept: { 'text/plain': ['.entities'] } }],
        })
        const w = await handle.createWritable()
        await w.write(eText)
        await w.close()
        useStore.getState().setEntitiesFileHandle(handle)
      } catch { /* cancelled */ }
    }
    useStore.setState({ entitiesDirty: false })
  }

  // Save registry
  const tiles = [...s.tiles.values()]
  if (tiles.length > 0) {
    const json = serializeRegistry(tiles)
    if (s.registryFileHandle) {
      const w = await s.registryFileHandle.createWritable()
      await w.write(json)
      await w.close()
    } else {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'tiles.tileregistry',
          types: [{ description: 'Tile Registry', accept: { 'application/json': ['.tileregistry', '.json'] } }],
        })
        const w = await handle.createWritable()
        await w.write(json)
        await w.close()
        useStore.getState().setRegistryFileHandle(handle)
      } catch { /* cancelled */ }
    }
    useStore.setState({ registryDirty: false })
  }
}
