import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { parseRegistry, serializeRegistry } from '../io/registryFile'
import { parseTerrain, serializeTerrain } from '../io/terrainFile'
import { parseEntities, serializeEntities } from '../io/entitiesFile'
import { parseNpcFile, serializeNpcFile } from '../io/npcFile'
import { importCSharpRegistry } from '../io/csharpImporter'
import { getRecentFiles, addRecentFile, clearRecentFiles } from '../utils/recentFiles'
import type { RecentEntry } from '../utils/recentFiles'

interface MenuItem {
  label: string
  action: () => void
  dim?: boolean
}

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [recentFiles, setRecentFiles] = useState<RecentEntry[]>([])
  const menuRef = useRef<HTMLDivElement>(null)

  const refreshRecent = () => { getRecentFiles().then(setRecentFiles) }

  useEffect(() => {
    refreshRecent()
  }, [])

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

  /** Record a file handle as recently used and refresh the list */
  const recordRecent = (name: string, kind: 'map' | 'registry', handle: FileSystemFileHandle) => {
    addRecentFile(name, kind, handle).then(refreshRecent)
  }

  const fileItems: MenuItem[] = [
    {
      label: 'New Map…',
      action: () => {
        const w = prompt('Map width (cells):', '30')
        const h = prompt('Map height (cells):', '20')
        if (w && h) {
          const width = parseInt(w)
          const height = parseInt(h)
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
        // Auto-prompt for matching .entities file
        try {
          const [eHandle] = await (window as any).showOpenFilePicker({
            types: [{ description: 'Entities files', accept: { 'text/plain': ['.entities'] } }],
          })
          if (eHandle) {
            const eFile = await eHandle.getFile()
            const eText = await eFile.text()
            const eResult = parseEntities(eText)
            if (eResult.errors.length > 0) {
              alert('Entity errors:\n' + eResult.errors.join('\n'))
            }
            store.getState().loadEntities(eResult.entities, eResult.comments, eResult.unknownLines)
            store.getState().setEntitiesFileHandle(eHandle)
          }
        } catch {
          // User cancelled — no entities loaded
        }
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
          const handle = await saveWithPicker(text, 'map.terrain', [
            { description: 'Terrain files', accept: { 'text/plain': ['.terrain'] } },
          ])
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
        const handle = await saveWithPicker(text, 'map.terrain', [
          { description: 'Terrain files', accept: { 'text/plain': ['.terrain'] } },
        ])
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
        if (result.errors.length > 0) {
          alert('Registry errors:\n' + result.errors.map((e) => e.message).join('\n'))
        }
        store.getState().loadRegistry(result.tiles)
        store.getState().setRegistryFileHandle(handle)
        recordRecent(file.name, 'registry', handle)
        if (result.tiles.length > 0) {
          store.getState().setActiveTile(result.tiles[0].code)
        }
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
          const handle = await saveWithPicker(json, 'tiles.tileregistry', [
            { description: 'Tile Registry', accept: { 'application/json': ['.tileregistry', '.json'] } },
          ])
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
        const handle = await saveWithPicker(json, 'tiles.tileregistry', [
          { description: 'Tile Registry', accept: { 'application/json': ['.tileregistry', '.json'] } },
        ])
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
        if (result.errors.length > 0) {
          alert('Import warnings:\n' + result.errors.join('\n'))
        }
        store.getState().loadRegistry(result.tiles)
        if (result.tiles.length > 0) {
          store.getState().setActiveTile(result.tiles[0].code)
        }
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
        if (result.errors.length > 0) {
          alert('Entity errors:\n' + result.errors.join('\n'))
        }
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
          const handle = await saveWithPicker(text, 'map.entities', [
            { description: 'Entities files', accept: { 'text/plain': ['.entities'] } },
          ])
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
        const handle = await saveWithPicker(text, 'map.entities', [
          { description: 'Entities files', accept: { 'text/plain': ['.entities'] } },
        ])
        if (!handle) return
        store.getState().setEntitiesFileHandle(handle)
        store.setState({ entitiesDirty: false })
      },
    },
    { label: '—', action: () => {} },
    {
      label: 'Open NPC File…',
      action: async () => {
        setOpenMenu(null)
        try {
          const [handle] = await (window as any).showOpenFilePicker({
            types: [{ description: 'NPC JSON', accept: { 'application/json': ['.json'] } }],
          })
          if (!handle) return
          const file = await handle.getFile()
          const text = await file.text()
          const npcs = parseNpcFile(text)
          store.getState().loadNpcs(npcs)
          store.getState().setNpcFileHandle(handle)
          store.getState().setEditorMode('npc')
        } catch {
          // User cancelled
        }
      },
    },
    {
      label: 'Save NPC File',
      action: async () => {
        setOpenMenu(null)
        const { npcs, npcFileHandle } = store.getState()
        if (npcs.length === 0) return
        const text = serializeNpcFile(npcs)
        if (npcFileHandle) {
          await writeToHandle(npcFileHandle, text)
        } else {
          const handle = await saveWithPicker(text, 'npcs.json', [
            { description: 'NPC JSON', accept: { 'application/json': ['.json'] } },
          ])
          if (!handle) return
          store.getState().setNpcFileHandle(handle)
        }
        store.setState({ npcsDirty: false })
      },
    },
    {
      label: 'Save NPC File As…',
      action: async () => {
        setOpenMenu(null)
        const { npcs } = store.getState()
        if (npcs.length === 0) return
        const text = serializeNpcFile(npcs)
        const handle = await saveWithPicker(text, 'npcs.json', [
          { description: 'NPC JSON', accept: { 'application/json': ['.json'] } },
        ])
        if (!handle) return
        store.getState().setNpcFileHandle(handle)
        store.setState({ npcsDirty: false })
      },
    },
    {
      label: 'Back to Map Editor',
      action: () => {
        store.getState().setEditorMode('map')
        setOpenMenu(null)
      },
    },
    { label: '—', action: () => {} },
    {
      label: 'Save All',
      action: async () => {
        setOpenMenu(null)
        await saveAll()
      },
    },
  ]

  // Build recent files section
  const recentMaps = recentFiles.filter((e) => e.kind === 'map')
  const recentRegistries = recentFiles.filter((e) => e.kind === 'registry')

  const openRecentMap = (entry: RecentEntry) => async () => {
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
      if (result.unknownCodes.size > 0) {
        alert(`Unknown tile codes: ${[...result.unknownCodes].join(', ')}`)
      }
    } catch {
      alert(`Could not open ${entry.name}. The file may have been moved or deleted.`)
    }
  }

  const openRecentRegistry = (entry: RecentEntry) => async () => {
    setOpenMenu(null)
    try {
      const perm = await (entry.handle as any).requestPermission({ mode: 'readwrite' })
      if (perm !== 'granted') return
      const file = await entry.handle.getFile()
      const json = await file.text()
      const result = parseRegistry(json)
      if (result.errors.length > 0) {
        alert('Registry errors:\n' + result.errors.map((e) => e.message).join('\n'))
      }
      store.getState().loadRegistry(result.tiles)
      store.getState().setRegistryFileHandle(entry.handle)
      recordRecent(file.name, 'registry', entry.handle)
      if (result.tiles.length > 0) {
        store.getState().setActiveTile(result.tiles[0].code)
      }
    } catch {
      alert(`Could not open ${entry.name}. The file may have been moved or deleted.`)
    }
  }

  if (recentMaps.length > 0 || recentRegistries.length > 0) {
    fileItems.push({ label: '—', action: () => {} })
    if (recentMaps.length > 0) {
      fileItems.push({ label: 'Recent Maps', action: () => {}, dim: true })
      for (const entry of recentMaps) {
        fileItems.push({ label: `  ${entry.name}`, action: openRecentMap(entry) })
      }
    }
    if (recentRegistries.length > 0) {
      fileItems.push({ label: 'Recent Registries', action: () => {}, dim: true })
      for (const entry of recentRegistries) {
        fileItems.push({ label: `  ${entry.name}`, action: openRecentRegistry(entry) })
      }
    }
    fileItems.push({ label: '—', action: () => {} })
    fileItems.push({
      label: 'Clear Recent Files',
      action: () => {
        clearRecentFiles().then(refreshRecent)
        setOpenMenu(null)
      },
    })
  }

  const editItems: MenuItem[] = [
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
  ]

  const viewItems: MenuItem[] = [
    {
      label: 'Toggle Grid',
      action: () => {
        store.getState().toggleGrid()
        setOpenMenu(null)
      },
    },
    {
      label: 'Reset Zoom',
      action: () => {
        store.getState().setZoom(1)
        store.getState().setPan(0, 0)
        setOpenMenu(null)
      },
    },
    { label: '—', action: () => {} },
    {
      label: store.getState().playerOverlay ? '✓ Player Overlay' : '  Player Overlay',
      action: () => {
        const on = !store.getState().playerOverlay
        store.getState().setPlayerOverlay(on)
        setOpenMenu(null)
      },
    },
    {
      label: store.getState().showEntities ? '✓ Show Entities' : '  Show Entities',
      action: () => {
        store.getState().toggleShowEntities()
        setOpenMenu(null)
      },
    },
  ]

  const menus: Record<string, MenuItem[]> = {
    File: fileItems,
    Edit: editItems,
    View: viewItems,
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
      <div
        className="mr-4 font-mono text-[13px] font-bold tracking-wider"
        style={{ color: 'var(--accent)' }}
      >
        TILEFORGE{' '}
        <span className="font-normal" style={{ color: 'var(--text-dim)' }}>
          v0.1
        </span>
      </div>
      {['File', 'Edit', 'View'].map((item) => (
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
          <div
            key={i}
            className="my-1 mx-2"
            style={{ height: 1, background: 'var(--border)' }}
          />
        ) : item.dim ? (
          <div
            key={i}
            className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase"
            style={{ color: 'var(--text-dim)' }}
          >
            {item.label}
          </div>
        ) : (
          <div
            key={i}
            className="px-3 py-1.5 text-xs cursor-pointer rounded mx-1 truncate"
            style={{ color: 'var(--text)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
            onClick={item.action}
          >
            {item.label}
          </div>
        ),
      )}
    </div>
  )
}

/** Save all dirty files (map, entities, registry) */
async function saveAll() {
  const s = useStore.getState()

  // Save map
  if (s.cells.length > 0) {
    const text = serializeTerrain(s.cells)
    if (s.mapFileHandle) {
      await writeToHandle(s.mapFileHandle, text)
    } else {
      const handle = await saveWithPicker(text, 'map.terrain', [
        { description: 'Terrain files', accept: { 'text/plain': ['.terrain'] } },
      ])
      if (handle) useStore.getState().setMapFileHandle(handle)
    }
    useStore.setState({ mapDirty: false })
  }

  // Save entities
  if (s.entities.length > 0 || s.entityComments.length > 0) {
    const text = serializeEntities(s.entities, s.entityComments, s.entityUnknownLines)
    if (s.entitiesFileHandle) {
      await writeToHandle(s.entitiesFileHandle, text)
    } else {
      const handle = await saveWithPicker(text, 'map.entities', [
        { description: 'Entities files', accept: { 'text/plain': ['.entities'] } },
      ])
      if (handle) useStore.getState().setEntitiesFileHandle(handle)
    }
    useStore.setState({ entitiesDirty: false })
  }

  // Save registry
  const tiles = [...s.tiles.values()]
  if (tiles.length > 0) {
    const json = serializeRegistry(tiles)
    if (s.registryFileHandle) {
      await writeToHandle(s.registryFileHandle, json)
    } else {
      const handle = await saveWithPicker(json, 'tiles.tileregistry', [
        { description: 'Tile Registry', accept: { 'application/json': ['.tileregistry', '.json'] } },
      ])
      if (handle) useStore.getState().setRegistryFileHandle(handle)
    }
    useStore.setState({ registryDirty: false })
  }
}

/** Write content to an existing file handle */
async function writeToHandle(handle: FileSystemFileHandle, content: string) {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

/** Prompt user for a save location and write content */
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
    return null // user cancelled
  }
}
