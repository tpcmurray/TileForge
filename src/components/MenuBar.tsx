import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { parseRegistry, serializeRegistry } from '../io/registryFile'
import { parseTerrain, serializeTerrain } from '../io/terrainFile'
import { importCSharpRegistry } from '../io/csharpImporter'

interface MenuItem {
  label: string
  action: () => void
}

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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
          }
        }
        setOpenMenu(null)
      },
    },
    {
      label: 'Open Map…',
      action: async () => {
        setOpenMenu(null)
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'Terrain files', accept: { 'text/plain': ['.terrain'] } }],
        }).catch(() => [null])
        if (!handle) return
        const file = await handle.getFile()
        const text = await file.text()
        const knownCodes = new Set(store.getState().tiles.keys())
        const result = parseTerrain(text, knownCodes)
        store.getState().loadMap(result.cells, result.width, result.height)
        store.getState().setMapFileHandle(handle)
        if (result.unknownCodes.size > 0) {
          alert(`Unknown tile codes: ${[...result.unknownCodes].join(', ')}`)
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
        } else {
          const handle = await saveWithPicker(text, 'map.terrain', [
            { description: 'Terrain files', accept: { 'text/plain': ['.terrain'] } },
          ])
          if (!handle) return
          store.getState().setMapFileHandle(handle)
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
        store.setState({ mapDirty: false })
      },
    },
    { label: '—', action: () => {} },
    {
      label: 'Open Registry…',
      action: async () => {
        setOpenMenu(null)
        const [handle] = await window.showOpenFilePicker({
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
        } else {
          const handle = await saveWithPicker(json, 'tiles.tileregistry', [
            { description: 'Tile Registry', accept: { 'application/json': ['.tileregistry', '.json'] } },
          ])
          if (!handle) return
          store.getState().setRegistryFileHandle(handle)
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
        store.setState({ registryDirty: false })
      },
    },
    {
      label: 'Import C# Registry…',
      action: async () => {
        setOpenMenu(null)
        const [handle] = await window.showOpenFilePicker({
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
  ]

  const menus: Record<string, MenuItem[]> = {
    File: fileItems,
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
      {['File', 'Edit', 'View', 'Help'].map((item) => (
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
      className="absolute top-full left-0 mt-0.5 py-1 rounded-md min-w-[180px]"
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 100,
      }}
    >
      {items.map((item, i) =>
        item.label === '—' ? (
          <div
            key={i}
            className="my-1 mx-2"
            style={{ height: 1, background: 'var(--border)' }}
          />
        ) : (
          <div
            key={i}
            className="px-3 py-1.5 text-xs cursor-pointer rounded mx-1"
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
  types: FilePickerAcceptType[],
): Promise<FileSystemFileHandle | null> {
  try {
    const handle = await window.showSaveFilePicker({ suggestedName, types })
    await writeToHandle(handle, content)
    return handle
  } catch {
    return null // user cancelled
  }
}
