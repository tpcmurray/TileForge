import { useState, useMemo, useRef } from 'react'
import { useStore } from '../store'
import { cp437ToUnicode } from '../utils/cp437'
import { rgbaToCSS } from '../rendering/tinting'
import { TileEditor } from './TileEditor'
import type { TileDefinition } from '../types'

export function TilePalette() {
  const tiles = useStore((s) => s.tiles)
  const activeTileCode = useStore((s) => s.activeTileCode)
  const setActiveTile = useStore((s) => s.setActiveTile)
  const addTile = useStore((s) => s.addTile)
  const updateTile = useStore((s) => s.updateTile)
  const deleteTile = useStore((s) => s.deleteTile)
  const [search, setSearch] = useState('')
  const [editingTile, setEditingTile] = useState<TileDefinition | null | 'new'>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tile: TileDefinition } | null>(null)

  const tileList = useMemo(() => [...tiles.values()], [tiles])

  const grouped = useMemo(() => {
    const filter = search.toLowerCase()
    const filtered = filter
      ? tileList.filter(
          (t) =>
            t.name.toLowerCase().includes(filter) ||
            t.code.toLowerCase().includes(filter),
        )
      : tileList

    const groups = new Map<string, TileDefinition[]>()
    for (const t of filtered) {
      const cat = t.category || 'Uncategorized'
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push(t)
    }
    return groups
  }, [tileList, search])

  const handleSave = (tile: TileDefinition, originalCode: string | null) => {
    if (originalCode && tiles.has(originalCode)) {
      updateTile(originalCode, tile)
    } else {
      addTile(tile)
    }
    setActiveTile(tile.code)
    setEditingTile(null)
  }

  const handleDuplicate = (source: TileDefinition) => {
    // Generate a unique code
    let newCode = source.code[0] + '_'
    let i = 0
    while (tiles.has(newCode) && i < 100) {
      newCode = source.code[0] + String.fromCharCode(48 + (i % 10))
      i++
    }
    setEditingTile({
      ...source,
      code: newCode,
      name: source.name + ' (copy)',
    })
    setContextMenu(null)
  }

  const handleDelete = (tile: TileDefinition) => {
    const { cells } = useStore.getState()
    let usageCount = 0
    for (const row of cells) {
      for (const c of row) {
        if (c === tile.code) usageCount++
      }
    }
    const msg = usageCount > 0
      ? `Delete "${tile.name}" (${tile.code})? It is used in ${usageCount} cells which will become unknown.`
      : `Delete "${tile.name}" (${tile.code})?`
    if (confirm(msg)) {
      deleteTile(tile.code)
      if (activeTileCode === tile.code) {
        const remaining = [...tiles.keys()].filter((c) => c !== tile.code)
        if (remaining.length > 0) setActiveTile(remaining[0])
      }
    }
    setContextMenu(null)
  }

  if (tileList.length === 0) {
    return (
      <div>
        <div className="text-xs mb-2" style={{ color: 'var(--text-dim)' }}>
          No registry loaded
        </div>
        <button
          className="w-full py-1.5 text-[11px] rounded cursor-pointer"
          style={{
            background: 'transparent',
            border: '1px dashed var(--border-light)',
            color: 'var(--text-dim)',
          }}
          onClick={() => setEditingTile('new')}
        >
          + New Tile
        </button>
        {editingTile !== null && (
          <TileEditor
            tile={editingTile === 'new' ? null : editingTile}
            existingCodes={new Set(tiles.keys())}
            onSave={handleSave}
            onClose={() => setEditingTile(null)}
          />
        )}
      </div>
    )
  }

  return (
    <div onClick={() => setContextMenu(null)}>
      {/* Search */}
      <input
        type="text"
        placeholder="Search tiles…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-2 py-1.5 rounded text-[11px] mb-2 outline-none"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
      />

      {/* Grouped tiles */}
      {[...grouped.entries()].map(([category, catTiles]) => (
        <div key={category}>
          <div
            className="font-mono text-[9px] uppercase tracking-wider py-1.5"
            style={{ color: 'var(--text-dim)' }}
          >
            {category}
          </div>
          <div className="grid grid-cols-5 gap-0.5 mb-1.5">
            {catTiles.map((t) => (
              <PaletteTile
                key={t.code}
                tile={t}
                selected={t.code === activeTileCode}
                onSelect={() => setActiveTile(t.code)}
                onDoubleClick={() => setEditingTile(t)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ x: e.clientX, y: e.clientY, tile: t })
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Add button */}
      <button
        className="w-full py-1.5 text-[11px] rounded cursor-pointer mt-1"
        style={{
          background: 'transparent',
          border: '1px dashed var(--border-light)',
          color: 'var(--text-dim)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.color = 'var(--accent)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-light)'
          e.currentTarget.style.color = 'var(--text-dim)'
        }}
        onClick={() => setEditingTile('new')}
      >
        + New Tile
      </button>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onEdit={() => { setEditingTile(contextMenu.tile); setContextMenu(null) }}
          onDuplicate={() => handleDuplicate(contextMenu.tile)}
          onDelete={() => handleDelete(contextMenu.tile)}
        />
      )}

      {/* Tile editor dialog */}
      {editingTile !== null && (
        <TileEditor
          tile={editingTile === 'new' ? null : editingTile}
          existingCodes={new Set(tiles.keys())}
          onSave={handleSave}
          onClose={() => setEditingTile(null)}
        />
      )}
    </div>
  )
}

function PaletteTile({
  tile,
  selected,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: {
  tile: TileDefinition
  selected: boolean
  onSelect: () => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const ch = cp437ToUnicode(tile.glyph)

  return (
    <div
      className="flex flex-col items-center justify-center rounded cursor-pointer border transition-all"
      style={{
        aspectRatio: '1',
        background: rgbaToCSS(tile.bg),
        borderColor: selected ? 'var(--accent)' : 'transparent',
        boxShadow: selected ? '0 0 0 1px var(--accent)' : 'none',
      }}
      title={`${tile.name} (${tile.code})`}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <span
        className="font-mono text-base leading-none"
        style={{ color: rgbaToCSS(tile.fg) }}
      >
        {ch}
      </span>
      <span
        className="font-mono text-[7px] mt-0.5"
        style={{ color: 'var(--text-dim)' }}
      >
        {tile.code}
      </span>
    </div>
  )
}

function ContextMenu({
  x,
  y,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  x: number
  y: number
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="fixed rounded-md py-1 min-w-[140px] z-50"
      style={{
        left: x,
        top: y,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <CtxItem label="Edit Tile" onClick={onEdit} />
      <CtxItem label="Duplicate Tile" onClick={onDuplicate} />
      <div className="my-1 mx-2" style={{ height: 1, background: 'var(--border)' }} />
      <CtxItem label="Delete Tile" onClick={onDelete} danger />
    </div>
  )
}

function CtxItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <div
      className="px-3 py-1.5 text-xs cursor-pointer rounded mx-1"
      style={{ color: danger ? 'var(--red)' : 'var(--text)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      {label}
    </div>
  )
}
