import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { parseRegistry, serializeRegistry } from '../io/registryFile'
import { parseTerrain, serializeTerrain } from '../io/terrainFile'
import { parseEntities, serializeEntities } from '../io/entitiesFile'
import { parseSpriteFile, serializeSpriteFile } from '../io/spriteFile'
import { parseDialogFile, serializeDialogFile } from '../io/dialogFile'
import { parseCutsceneFile, serializeCutsceneFile } from '../io/cutsceneFile'
import { importCSharpRegistry } from '../io/csharpImporter'
import { getRecentFiles, addRecentFile, clearRecentFiles } from '../utils/recentFiles'
import type { RecentEntry } from '../utils/recentFiles'

interface MenuItem {
  label: string
  action: () => void
  dim?: boolean
}

type EditorMode = 'map' | 'sprites' | 'dialogs' | 'cutscenes'

const MODE_TABS: { mode: EditorMode; label: string }[] = [
  { mode: 'map', label: 'Map' },
  { mode: 'sprites', label: 'Sprites' },
  { mode: 'dialogs', label: 'Dialogs' },
  { mode: 'cutscenes', label: 'Cutscenes' },
]

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [recentFiles, setRecentFiles] = useState<RecentEntry[]>([])
  const menuRef = useRef<HTMLDivElement>(null)
  const editorMode = useStore((s) => s.editorMode)
  const mapDirty = useStore((s) => s.mapDirty)
  const registryDirty = useStore((s) => s.registryDirty)
  const entitiesDirty = useStore((s) => s.entitiesDirty)
  const spritesDirty = useStore((s) => s.spritesDirty)
  const dialogsDirty = useStore((s) => s.dialogsDirty)
  const cutscenesDirty = useStore((s) => s.cutscenesDirty)

  const refreshRecent = () => { getRecentFiles().then(setRecentFiles) }

  useEffect(() => { refreshRecent() }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const store = useStore

  const recordRecent = (name: string, kind: 'map' | 'registry', handle: FileSystemFileHandle) => {
    addRecentFile(name, kind, handle).then(refreshRecent)
  }

  // ── Mode-aware File menu ──
  const fileItems: MenuItem[] = buildFileItems(editorMode, setOpenMenu, store, recordRecent, recentFiles, refreshRecent)

  // ── Edit menu (map-only for now) ──
  const editItems: MenuItem[] = editorMode === 'map' ? [
    {
      label: 'Resize Canvas…',
      action: () => {
        const { mapWidth, mapHeight, cells } = store.getState()
        const w = prompt('New width (cells):', String(mapWidth))
        const h = prompt('New height (cells):', String(mapHeight))
        if (!w || !h) return
        const newW = parseInt(w)
        const newH = parseInt(h)
        if (newW <= 0 || newH <= 0 || isNaN(newW) || isNaN(newH)) return
        const newCells: string[][] = Array.from({ length: newH }, (_, row) =>
          Array.from({ length: newW }, (_, col) =>
            row < cells.length && col < (cells[row]?.length ?? 0)
              ? cells[row][col]
              : '..'
          )
        )
        store.getState().loadMap(newCells, newW, newH)
        store.setState({ mapDirty: true })
        setOpenMenu(null)
      },
    },
  ] : []

  // ── View menu (map-only for now) ──
  const viewItems: MenuItem[] = editorMode === 'map' ? [
    {
      label: 'Toggle Grid',
      action: () => { store.getState().toggleGrid(); setOpenMenu(null) },
    },
    {
      label: 'Reset Zoom',
      action: () => { store.getState().setZoom(1); store.getState().setPan(0, 0); setOpenMenu(null) },
    },
    { label: '—', action: () => {} },
    {
      label: store.getState().playerOverlay ? '✓ Player Overlay' : '  Player Overlay',
      action: () => { store.getState().setPlayerOverlay(!store.getState().playerOverlay); setOpenMenu(null) },
    },
    {
      label: store.getState().showEntities ? '✓ Show Entities' : '  Show Entities',
      action: () => { store.getState().toggleShowEntities(); setOpenMenu(null) },
    },
  ] : []

  const menuNames = ['File']
  if (editItems.length > 0) menuNames.push('Edit')
  if (viewItems.length > 0) menuNames.push('View')

  const menus: Record<string, MenuItem[]> = { File: fileItems }
  if (editItems.length > 0) menus.Edit = editItems
  if (viewItems.length > 0) menus.View = viewItems

  // Dirty indicators per mode tab
  const modeDirty: Record<EditorMode, boolean> = {
    map: mapDirty || registryDirty || entitiesDirty,
    sprites: spritesDirty,
    dialogs: dialogsDirty,
    cutscenes: cutscenesDirty,
  }

  return (
    <div
      ref={menuRef}
      className="flex items-center px-3 gap-0.5 relative"
      style={{
        height: 'var(--menubar-height)',
        background: 'var(--bg-dark)',
        borderBottom: '1px solid var(--border)',
        zIndex: 50,
      }}
    >
      {/* App title */}
      <div
        className="mr-3 font-mono text-[13px] font-bold tracking-wider"
        style={{ color: 'var(--accent)' }}
      >
        TILEFORGE{' '}
        <span className="font-normal" style={{ color: 'var(--text-dim)' }}>v0.1</span>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-0.5 mr-3">
        {MODE_TABS.map(({ mode, label }) => (
          <button
            key={mode}
            className="px-2.5 py-1 text-[11px] font-mono rounded cursor-pointer relative"
            style={{
              background: editorMode === mode ? 'var(--bg-panel)' : 'transparent',
              color: editorMode === mode ? 'var(--accent)' : 'var(--text-dim)',
              border: editorMode === mode ? '1px solid var(--border-light)' : '1px solid transparent',
              borderBottom: editorMode === mode ? '2px solid var(--accent)' : '2px solid transparent',
            }}
            onClick={() => store.getState().setEditorMode(mode)}
          >
            {label}
            {modeDirty[mode] && (
              <span
                className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--accent)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-4 mr-2" style={{ background: 'var(--border)' }} />

      {/* Save All button */}
      <button
        className="px-2 py-1 text-[11px] font-mono rounded cursor-pointer mr-1"
        style={{
          color: Object.values(modeDirty).some(Boolean) ? 'var(--accent)' : 'var(--text-dim)',
          background: 'transparent',
          border: '1px solid var(--border)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        onClick={() => saveAll()}
        title="Save All (Ctrl+Shift+S)"
      >
        Save All
      </button>

      {/* Menu triggers */}
      {menuNames.map((item) => (
        <div key={item} className="relative">
          <div
            className="px-2.5 py-1 text-xs rounded cursor-pointer transition-colors"
            style={{
              color: openMenu === item ? 'var(--text)' : 'var(--text-dim)',
              background: openMenu === item ? 'var(--bg-hover)' : 'transparent',
            }}
            onClick={() => setOpenMenu(openMenu === item ? null : item)}
            onMouseEnter={(e) => {
              if (openMenu && openMenu !== item && menus[item]) setOpenMenu(item)
              e.currentTarget.style.background = 'var(--bg-hover)'
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              if (openMenu !== item) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-dim)'
              }
            }}
          >
            {item}
          </div>
          {openMenu === item && menus[item] && (
            <DropdownMenu items={menus[item]} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Build mode-aware File menu ──

function buildFileItems(
  mode: EditorMode,
  setOpenMenu: (m: string | null) => void,
  store: typeof useStore,
  recordRecent: (name: string, kind: 'map' | 'registry', handle: FileSystemFileHandle) => void,
  recentFiles: RecentEntry[],
  refreshRecent: () => void,
): MenuItem[] {
  const items: MenuItem[] = []

  if (mode === 'map') {
    items.push(
      {
        label: 'New Map…',
        action: () => {
          const w = prompt('Map width (cells):', '30')
          const h = prompt('Map height (cells):', '20')
          if (w && h) {
            const width = parseInt(w), height = parseInt(h)
            if (width > 0 && height > 0) {
              store.getState().clearMap(width, height, '..')
              store.getState().setMapFileHandle(null)
            }
          }
          setOpenMenu(null)
        },
      },
      {
        label: 'Open Map…',
        action: async () => {
          setOpenMenu(null)
          const [handle] = await (window as any).showOpenFilePicker({
            types: [{ description: 'Terrain files', accept: { 'text/plain': ['.terrain'] } }],
          }).catch(() => [null])
          if (!handle) return
          const file = await handle.getFile()
          const text = await file.text()
          const knownCodes = new Set(store.getState().tiles.keys())
          const result = parseTerrain(text, knownCodes)
          store.getState().loadMap(result.cells, result.width, result.height)
          store.getState().setMapFileHandle(handle)
          recordRecent(file.name, 'map', handle)
          if (result.unknownCodes.size > 0) {
            alert(`Unknown tile codes: ${[...result.unknownCodes].join(', ')}`)
          }
          try {
            const [eHandle] = await (window as any).showOpenFilePicker({
              types: [{ description: 'Entities files', accept: { 'text/plain': ['.entities'] } }],
            })
            if (eHandle) {
              const eFile = await eHandle.getFile()
              const eText = await eFile.text()
              const eResult = parseEntities(eText)
              if (eResult.errors.length > 0) alert('Entity errors:\n' + eResult.errors.join('\n'))
              store.getState().loadEntities(eResult.entities, eResult.comments, eResult.unknownLines)
              store.getState().setEntitiesFileHandle(eHandle)
            }
          } catch { /* cancelled */ }
        },
      },
      {
        label: 'Save Map',
        action: async () => {
          setOpenMenu(null)
          const { cells, mapFileHandle } = store.getState()
          if (cells.length === 0) return
          const text = serializeTerrain(cells)
          if (mapFileHandle) {
            await writeToHandle(mapFileHandle, text)
            recordRecent((await mapFileHandle.getFile()).name, 'map', mapFileHandle)
          } else {
            const handle = await saveWithPicker(text, 'map.terrain', [{ description: 'Terrain files', accept: { 'text/plain': ['.terrain'] } }])
            if (!handle) return
            store.getState().setMapFileHandle(handle)
            recordRecent((await handle.getFile()).name, 'map', handle)
          }
          store.setState({ mapDirty: false })
        },
      },
      {
        label: 'Save Map As…',
        action: async () => {
          setOpenMenu(null)
          const { cells } = store.getState()
          if (cells.length === 0) return
          const text = serializeTerrain(cells)
          const handle = await saveWithPicker(text, 'map.terrain', [{ description: 'Terrain files', accept: { 'text/plain': ['.terrain'] } }])
          if (!handle) return
          store.getState().setMapFileHandle(handle)
          recordRecent((await handle.getFile()).name, 'map', handle)
          store.setState({ mapDirty: false })
        },
      },
      { label: '—', action: () => {} },
      {
        label: 'Open Registry…',
        action: async () => {
          setOpenMenu(null)
          const [handle] = await (window as any).showOpenFilePicker({
            types: [{ description: 'Tile Registry', accept: { 'application/json': ['.tileregistry', '.json'] } }],
          }).catch(() => [null])
          if (!handle) return
          const file = await handle.getFile()
          const json = await file.text()
          const result = parseRegistry(json)
          if (result.errors.length > 0) alert('Registry errors:\n' + result.errors.map((e) => e.message).join('\n'))
          store.getState().loadRegistry(result.tiles)
          store.getState().setRegistryFileHandle(handle)
          recordRecent(file.name, 'registry', handle)
          if (result.tiles.length > 0) store.getState().setActiveTile(result.tiles[0].code)
        },
      },
      {
        label: 'Save Registry',
        action: async () => {
          setOpenMenu(null)
          const tiles = [...store.getState().tiles.values()]
          if (tiles.length === 0) return
          const json = serializeRegistry(tiles)
          const { registryFileHandle } = store.getState()
          if (registryFileHandle) {
            await writeToHandle(registryFileHandle, json)
            recordRecent((await registryFileHandle.getFile()).name, 'registry', registryFileHandle)
          } else {
            const handle = await saveWithPicker(json, 'tiles.tileregistry', [{ description: 'Tile Registry', accept: { 'application/json': ['.tileregistry', '.json'] } }])
            if (!handle) return
            store.getState().setRegistryFileHandle(handle)
            recordRecent((await handle.getFile()).name, 'registry', handle)
          }
          store.setState({ registryDirty: false })
        },
      },
      {
        label: 'Save Registry As…',
        action: async () => {
          setOpenMenu(null)
          const tiles = [...store.getState().tiles.values()]
          if (tiles.length === 0) return
          const json = serializeRegistry(tiles)
          const handle = await saveWithPicker(json, 'tiles.tileregistry', [{ description: 'Tile Registry', accept: { 'application/json': ['.tileregistry', '.json'] } }])
          if (!handle) return
          store.getState().setRegistryFileHandle(handle)
          recordRecent((await handle.getFile()).name, 'registry', handle)
          store.setState({ registryDirty: false })
        },
      },
      {
        label: 'Import C# Registry…',
        action: async () => {
          setOpenMenu(null)
          const [handle] = await (window as any).showOpenFilePicker({
            types: [{ description: 'C# Source', accept: { 'text/plain': ['.cs'] } }],
          }).catch(() => [null])
          if (!handle) return
          const file = await handle.getFile()
          const source = await file.text()
          const result = importCSharpRegistry(source)
          if (result.errors.length > 0) alert('Import warnings:\n' + result.errors.join('\n'))
          store.getState().loadRegistry(result.tiles)
          if (result.tiles.length > 0) store.getState().setActiveTile(result.tiles[0].code)
          alert(`Imported ${result.tiles.length} tiles`)
        },
      },
      { label: '—', action: () => {} },
      {
        label: 'Open Entities…',
        action: async () => {
          setOpenMenu(null)
          const [handle] = await (window as any).showOpenFilePicker({
            types: [{ description: 'Entities files', accept: { 'text/plain': ['.entities'] } }],
          }).catch(() => [null])
          if (!handle) return
          const file = await handle.getFile()
          const text = await file.text()
          const result = parseEntities(text)
          if (result.errors.length > 0) alert('Entity errors:\n' + result.errors.join('\n'))
          store.getState().loadEntities(result.entities, result.comments, result.unknownLines)
          store.getState().setEntitiesFileHandle(handle)
        },
      },
      {
        label: 'Save Entities',
        action: async () => {
          setOpenMenu(null)
          const { entities, entityComments, entityUnknownLines, entitiesFileHandle } = store.getState()
          if (entities.length === 0 && entityComments.length === 0) return
          const text = serializeEntities(entities, entityComments, entityUnknownLines)
          if (entitiesFileHandle) {
            await writeToHandle(entitiesFileHandle, text)
          } else {
            const handle = await saveWithPicker(text, 'map.entities', [{ description: 'Entities files', accept: { 'text/plain': ['.entities'] } }])
            if (!handle) return
            store.getState().setEntitiesFileHandle(handle)
          }
          store.setState({ entitiesDirty: false })
        },
      },
      {
        label: 'Save Entities As…',
        action: async () => {
          setOpenMenu(null)
          const { entities, entityComments, entityUnknownLines } = store.getState()
          if (entities.length === 0 && entityComments.length === 0) return
          const text = serializeEntities(entities, entityComments, entityUnknownLines)
          const handle = await saveWithPicker(text, 'map.entities', [{ description: 'Entities files', accept: { 'text/plain': ['.entities'] } }])
          if (!handle) return
          store.getState().setEntitiesFileHandle(handle)
          store.setState({ entitiesDirty: false })
        },
      },
    )

    // Recent files
    const recentMaps = recentFiles.filter((e) => e.kind === 'map')
    const recentRegistries = recentFiles.filter((e) => e.kind === 'registry')
    if (recentMaps.length > 0 || recentRegistries.length > 0) {
      items.push({ label: '—', action: () => {} })
      if (recentMaps.length > 0) {
        items.push({ label: 'Recent Maps', action: () => {}, dim: true })
        for (const entry of recentMaps) {
          items.push({
            label: `  ${entry.name}`,
            action: async () => {
              setOpenMenu(null)
              try {
                const perm = await (entry.handle as any).requestPermission({ mode: 'readwrite' })
                if (perm !== 'granted') return
                const file = await entry.handle.getFile()
                const text = await file.text()
                const knownCodes = new Set(store.getState().tiles.keys())
                const result = parseTerrain(text, knownCodes)
                store.getState().loadMap(result.cells, result.width, result.height)
                store.getState().setMapFileHandle(entry.handle)
                recordRecent(file.name, 'map', entry.handle)
                if (result.unknownCodes.size > 0) alert(`Unknown tile codes: ${[...result.unknownCodes].join(', ')}`)
              } catch { alert(`Could not open ${entry.name}.`) }
            },
          })
        }
      }
      if (recentRegistries.length > 0) {
        items.push({ label: 'Recent Registries', action: () => {}, dim: true })
        for (const entry of recentRegistries) {
          items.push({
            label: `  ${entry.name}`,
            action: async () => {
              setOpenMenu(null)
              try {
                const perm = await (entry.handle as any).requestPermission({ mode: 'readwrite' })
                if (perm !== 'granted') return
                const file = await entry.handle.getFile()
                const json = await file.text()
                const result = parseRegistry(json)
                if (result.errors.length > 0) alert('Registry errors:\n' + result.errors.map((e) => e.message).join('\n'))
                store.getState().loadRegistry(result.tiles)
                store.getState().setRegistryFileHandle(entry.handle)
                recordRecent(file.name, 'registry', entry.handle)
                if (result.tiles.length > 0) store.getState().setActiveTile(result.tiles[0].code)
              } catch { alert(`Could not open ${entry.name}.`) }
            },
          })
        }
      }
      items.push({ label: '—', action: () => {} })
      items.push({
        label: 'Clear Recent Files',
        action: () => { clearRecentFiles().then(refreshRecent); setOpenMenu(null) },
      })
    }
  }

  if (mode === 'sprites') {
    items.push(
      {
        label: 'Open Sprite File…',
        action: async () => {
          setOpenMenu(null)
          try {
            const [handle] = await (window as any).showOpenFilePicker({
              types: [{ description: 'Sprite JSON', accept: { 'application/json': ['.json'] } }],
            })
            if (!handle) return
            const file = await handle.getFile()
            const text = await file.text()
            const sprites = parseSpriteFile(text)
            store.getState().loadSprites(sprites)
            store.getState().setSpriteFileHandle(handle)
          } catch { /* cancelled */ }
        },
      },
      {
        label: 'Save Sprite File',
        action: async () => {
          setOpenMenu(null)
          const { sprites, spriteFileHandle } = store.getState()
          if (sprites.length === 0) return
          const text = serializeSpriteFile(sprites)
          if (spriteFileHandle) {
            await writeToHandle(spriteFileHandle, text)
          } else {
            const handle = await saveWithPicker(text, 'sprites.json', [{ description: 'Sprite JSON', accept: { 'application/json': ['.json'] } }])
            if (!handle) return
            store.getState().setSpriteFileHandle(handle)
          }
          store.setState({ spritesDirty: false })
        },
      },
      {
        label: 'Save Sprite File As…',
        action: async () => {
          setOpenMenu(null)
          const { sprites } = store.getState()
          if (sprites.length === 0) return
          const text = serializeSpriteFile(sprites)
          const handle = await saveWithPicker(text, 'sprites.json', [{ description: 'Sprite JSON', accept: { 'application/json': ['.json'] } }])
          if (!handle) return
          store.getState().setSpriteFileHandle(handle)
          store.setState({ spritesDirty: false })
        },
      },
    )
  }

  if (mode === 'dialogs') {
    items.push(
      {
        label: 'Open Dialog File…',
        action: async () => {
          setOpenMenu(null)
          try {
            const [handle] = await (window as any).showOpenFilePicker({
              types: [{ description: 'Dialog JSON', accept: { 'application/json': ['.json'] } }],
            })
            if (!handle) return
            const file = await handle.getFile()
            const text = await file.text()
            const trees = parseDialogFile(text)
            store.getState().loadDialogs(trees)
            store.getState().setDialogFileHandle(handle)
          } catch { /* cancelled */ }
        },
      },
      {
        label: 'Save Dialog File',
        action: async () => {
          setOpenMenu(null)
          const { dialogTrees, dialogFileHandle } = store.getState()
          if (dialogTrees.length === 0) return
          const text = serializeDialogFile(dialogTrees)
          if (dialogFileHandle) {
            await writeToHandle(dialogFileHandle, text)
          } else {
            const handle = await saveWithPicker(text, 'dialogues.json', [{ description: 'Dialog JSON', accept: { 'application/json': ['.json'] } }])
            if (!handle) return
            store.getState().setDialogFileHandle(handle)
          }
          store.setState({ dialogsDirty: false })
        },
      },
      {
        label: 'Save Dialog File As…',
        action: async () => {
          setOpenMenu(null)
          const { dialogTrees } = store.getState()
          if (dialogTrees.length === 0) return
          const text = serializeDialogFile(dialogTrees)
          const handle = await saveWithPicker(text, 'dialogues.json', [{ description: 'Dialog JSON', accept: { 'application/json': ['.json'] } }])
          if (!handle) return
          store.getState().setDialogFileHandle(handle)
          store.setState({ dialogsDirty: false })
        },
      },
    )
  }

  if (mode === 'cutscenes') {
    items.push(
      {
        label: 'Open Cutscene File…',
        action: async () => {
          setOpenMenu(null)
          try {
            const [handle] = await (window as any).showOpenFilePicker({
              types: [{ description: 'Cutscene JSON', accept: { 'application/json': ['.json'] } }],
            })
            if (!handle) return
            const file = await handle.getFile()
            const text = await file.text()
            const cutscenes = parseCutsceneFile(text)
            store.getState().loadCutscenes(cutscenes)
            store.getState().setCutsceneFileHandle(handle)
          } catch { /* cancelled */ }
        },
      },
      {
        label: 'Save Cutscene File',
        action: async () => {
          setOpenMenu(null)
          const { cutscenes, cutsceneFileHandle } = store.getState()
          if (cutscenes.length === 0) return
          const text = serializeCutsceneFile(cutscenes)
          if (cutsceneFileHandle) {
            await writeToHandle(cutsceneFileHandle, text)
          } else {
            const handle = await saveWithPicker(text, 'cutscenes.json', [{ description: 'Cutscene JSON', accept: { 'application/json': ['.json'] } }])
            if (!handle) return
            store.getState().setCutsceneFileHandle(handle)
          }
          store.setState({ cutscenesDirty: false })
        },
      },
      {
        label: 'Save Cutscene File As…',
        action: async () => {
          setOpenMenu(null)
          const { cutscenes } = store.getState()
          if (cutscenes.length === 0) return
          const text = serializeCutsceneFile(cutscenes)
          const handle = await saveWithPicker(text, 'cutscenes.json', [{ description: 'Cutscene JSON', accept: { 'application/json': ['.json'] } }])
          if (!handle) return
          store.getState().setCutsceneFileHandle(handle)
          store.setState({ cutscenesDirty: false })
        },
      },
    )
  }

  // Save All — always available
  items.push(
    { label: '—', action: () => {} },
    {
      label: 'Save All',
      action: async () => { setOpenMenu(null); await saveAll() },
    },
  )

  return items
}

function DropdownMenu({ items }: { items: MenuItem[] }) {
  return (
    <div
      className="absolute top-full left-0 mt-0.5 py-1 rounded-md min-w-[220px]"
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 100,
        maxHeight: 420,
        overflowY: 'auto',
      }}
    >
      {items.map((item, i) =>
        item.label === '—' ? (
          <div key={i} className="my-1 mx-2" style={{ height: 1, background: 'var(--border)' }} />
        ) : item.dim ? (
          <div key={i} className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase" style={{ color: 'var(--text-dim)' }}>
            {item.label}
          </div>
        ) : (
          <div
            key={i}
            className="px-3 py-1.5 text-xs cursor-pointer rounded mx-1 truncate"
            style={{ color: 'var(--text)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            onClick={item.action}
          >
            {item.label}
          </div>
        ),
      )}
    </div>
  )
}

async function saveAll() {
  const s = useStore.getState()

  if (s.cells.length > 0) {
    const text = serializeTerrain(s.cells)
    if (s.mapFileHandle) {
      await writeToHandle(s.mapFileHandle, text)
    } else {
      const handle = await saveWithPicker(text, 'map.terrain', [{ description: 'Terrain files', accept: { 'text/plain': ['.terrain'] } }])
      if (handle) useStore.getState().setMapFileHandle(handle)
    }
    useStore.setState({ mapDirty: false })
  }

  if (s.entities.length > 0 || s.entityComments.length > 0) {
    const text = serializeEntities(s.entities, s.entityComments, s.entityUnknownLines)
    if (s.entitiesFileHandle) {
      await writeToHandle(s.entitiesFileHandle, text)
    } else {
      const handle = await saveWithPicker(text, 'map.entities', [{ description: 'Entities files', accept: { 'text/plain': ['.entities'] } }])
      if (handle) useStore.getState().setEntitiesFileHandle(handle)
    }
    useStore.setState({ entitiesDirty: false })
  }

  const tiles = [...s.tiles.values()]
  if (tiles.length > 0) {
    const json = serializeRegistry(tiles)
    if (s.registryFileHandle) {
      await writeToHandle(s.registryFileHandle, json)
    } else {
      const handle = await saveWithPicker(json, 'tiles.tileregistry', [{ description: 'Tile Registry', accept: { 'application/json': ['.tileregistry', '.json'] } }])
      if (handle) useStore.getState().setRegistryFileHandle(handle)
    }
    useStore.setState({ registryDirty: false })
  }

  if (s.sprites.length > 0) {
    const text = serializeSpriteFile(s.sprites)
    if (s.spriteFileHandle) {
      await writeToHandle(s.spriteFileHandle, text)
    } else {
      const handle = await saveWithPicker(text, 'sprites.json', [{ description: 'Sprite JSON', accept: { 'application/json': ['.json'] } }])
      if (handle) useStore.getState().setSpriteFileHandle(handle)
    }
    useStore.setState({ spritesDirty: false })
  }

  if (s.dialogTrees.length > 0) {
    const text = serializeDialogFile(s.dialogTrees)
    if (s.dialogFileHandle) {
      await writeToHandle(s.dialogFileHandle, text)
    } else {
      const handle = await saveWithPicker(text, 'dialogues.json', [{ description: 'Dialog JSON', accept: { 'application/json': ['.json'] } }])
      if (handle) useStore.getState().setDialogFileHandle(handle)
    }
    useStore.setState({ dialogsDirty: false })
  }

  if (s.cutscenes.length > 0) {
    const text = serializeCutsceneFile(s.cutscenes)
    if (s.cutsceneFileHandle) {
      await writeToHandle(s.cutsceneFileHandle, text)
    } else {
      const handle = await saveWithPicker(text, 'cutscenes.json', [{ description: 'Cutscene JSON', accept: { 'application/json': ['.json'] } }])
      if (handle) useStore.getState().setCutsceneFileHandle(handle)
    }
    useStore.setState({ cutscenesDirty: false })
  }
}

async function writeToHandle(handle: FileSystemFileHandle, content: string) {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

async function saveWithPicker(
  content: string,
  suggestedName: string,
  types: { description: string; accept: Record<string, string[]> }[],
): Promise<FileSystemFileHandle | null> {
  try {
    const handle = await (window as any).showSaveFilePicker({ suggestedName, types })
    await writeToHandle(handle, content)
    return handle
  } catch {
    return null
  }
}
