import { useState, useMemo, useEffect } from 'react'
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
  // null = closed; 'new' = creating from scratch; { tile } = editing existing; { tile, duplicate: true } = creating new from template
  const [editingTile, setEditingTile] = useState<
    null | 'new' | { tile: TileDefinition; duplicate?: boolean }
  >(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tile: TileDefinition } | null>(null)
  const [replacingTile, setReplacingTile] = useState<TileDefinition | null>(null)

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
    // Generate a unique 2-char code by trying source[0] + each char from a wide alphabet,
    // then falling back to scanning all 2-char combos.
    const alphabet = '_0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let newCode = ''
    for (const c of alphabet) {
      const candidate = source.code[0] + c
      if (!tiles.has(candidate)) { newCode = candidate; break }
    }
    if (!newCode) {
      outer: for (const a of alphabet) {
        for (const b of alphabet) {
          if (!tiles.has(a + b)) { newCode = a + b; break outer }
        }
      }
    }
    if (!newCode) return // registry effectively full
    setEditingTile({
      tile: { ...source, code: newCode, name: source.name + ' (copy)' },
      duplicate: true,
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
            tile={editingTile === 'new' ? null : editingTile.tile}
            originalCode={
              editingTile === 'new' || editingTile.duplicate ? null : editingTile.tile.code
            }
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
          <div className="grid grid-cols-8 gap-0.5 mb-1.5">
            {catTiles.map((t) => (
              <PaletteTile
                key={t.code}
                tile={t}
                selected={t.code === activeTileCode}
                onSelect={() => setActiveTile(t.code)}
                onDoubleClick={() => setEditingTile({ tile: t })}
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
          onEdit={() => { setEditingTile({ tile: contextMenu.tile }); setContextMenu(null) }}
          onDuplicate={() => handleDuplicate(contextMenu.tile)}
          onReplace={() => { setReplacingTile(contextMenu.tile); setContextMenu(null) }}
          onDelete={() => handleDelete(contextMenu.tile)}
        />
      )}

      {/* Replace dialog */}
      {replacingTile && (
        <ReplaceTileDialog
          source={replacingTile}
          tiles={tileList}
          onClose={() => setReplacingTile(null)}
        />
      )}

      {/* Tile editor dialog */}
      {editingTile !== null && (
        <TileEditor
          tile={editingTile === 'new' ? null : editingTile.tile}
          originalCode={
            editingTile === 'new' || editingTile.duplicate ? null : editingTile.tile.code
          }
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
      className="flex items-center justify-center rounded cursor-pointer border transition-all"
      style={{
        aspectRatio: '1/2',
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
        className="font-mono text-xs leading-none"
        style={{ color: rgbaToCSS(tile.fg) }}
      >
        {ch}
      </span>
    </div>
  )
}

function ContextMenu({
  x,
  y,
  onEdit,
  onDuplicate,
  onReplace,
  onDelete,
}: {
  x: number
  y: number
  onEdit: () => void
  onDuplicate: () => void
  onReplace: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="fixed rounded-md py-1 min-w-[160px] z-50"
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
      <CtxItem label="Replace All On Map…" onClick={onReplace} />
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

function ReplaceTileDialog({
  source,
  tiles,
  onClose,
}: {
  source: TileDefinition
  tiles: TileDefinition[]
  onClose: () => void
}) {
  const cells = useStore((s) => s.cells)
  const replaceAllCells = useStore((s) => s.replaceAllCells)

  const [targetCode, setTargetCode] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const sourceCount = useMemo(() => {
    let n = 0
    for (const row of cells) for (const c of row) if (c === source.code) n++
    return n
  }, [cells, source.code])

  const candidates = useMemo(() => {
    const f = search.toLowerCase()
    return tiles
      .filter((t) => t.code !== source.code)
      .filter((t) => !f || t.name.toLowerCase().includes(f) || t.code.toLowerCase().includes(f))
  }, [tiles, search, source.code])

  const handleConfirm = () => {
    if (!targetCode) return
    replaceAllCells(source.code, targetCode)
    onClose()
  }

  const TilePreview = ({ t }: { t: TileDefinition }) => (
    <span
      className="inline-flex items-center justify-center rounded font-mono"
      style={{
        background: rgbaToCSS(t.bg),
        color: rgbaToCSS(t.fg),
        width: 22, height: 28, fontSize: 14, flexShrink: 0,
        border: '1px solid var(--border)',
      }}
      title={`${t.name} (${t.code})`}
    >
      {cp437ToUnicode(t.glyph)}
    </span>
  )

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-xl p-5"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-light)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          width: 420,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="font-mono text-sm font-semibold" style={{ color: 'var(--text-bright)' }}>
            Replace Tile On Map
          </div>
          <button
            className="px-1.5 py-0.5 rounded text-lg cursor-pointer"
            style={{ color: 'var(--text-dim)', background: 'none', border: 'none' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="mb-3">
          <div className="text-[10px] font-mono uppercase mb-1" style={{ color: 'var(--text-dim)' }}>
            From
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <TilePreview t={source} />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs truncate" style={{ color: 'var(--text)' }}>{source.name}</div>
              <div className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                {source.code} · {sourceCount} cell{sourceCount === 1 ? '' : 's'} on map
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-col min-h-0">
          <div className="text-[10px] font-mono uppercase mb-1" style={{ color: 'var(--text-dim)' }}>
            To
          </div>
          <input
            type="text"
            placeholder="Search tiles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1.5 rounded text-[11px] mb-1.5 outline-none"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            autoFocus
          />
          <div
            className="rounded overflow-y-auto"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              maxHeight: 240,
            }}
          >
            {candidates.length === 0 && (
              <div className="px-3 py-2 text-[11px] font-mono" style={{ color: 'var(--text-dim)' }}>
                No matching tiles.
              </div>
            )}
            {candidates.map((t) => {
              const sel = t.code === targetCode
              return (
                <div
                  key={t.code}
                  className="flex items-center gap-2 px-2 py-1 cursor-pointer"
                  style={{
                    background: sel ? 'var(--accent-glow)' : 'transparent',
                    borderLeft: `2px solid ${sel ? 'var(--accent)' : 'transparent'}`,
                  }}
                  onClick={() => setTargetCode(t.code)}
                  onDoubleClick={() => { setTargetCode(t.code); setTimeout(handleConfirm, 0) }}
                >
                  <TilePreview t={t} />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs truncate" style={{ color: sel ? 'var(--accent)' : 'var(--text)' }}>
                      {t.name}
                    </div>
                    <div className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                      {t.code}{t.category ? ` · ${t.category}` : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <div className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
            {sourceCount === 0
              ? 'No cells to replace.'
              : targetCode
                ? `Will replace ${sourceCount} cell${sourceCount === 1 ? '' : 's'}.`
                : 'Pick a destination tile.'}
          </div>
          <div className="flex-1" />
          <button
            className="text-xs px-3 py-1.5 rounded cursor-pointer"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="text-xs px-4 py-1.5 rounded cursor-pointer"
            style={{
              background: targetCode && sourceCount > 0 ? 'var(--accent)' : 'var(--bg-surface)',
              border: `1px solid ${targetCode && sourceCount > 0 ? 'var(--accent)' : 'var(--border)'}`,
              color: targetCode && sourceCount > 0 ? '#fff' : 'var(--text-dim)',
              opacity: targetCode && sourceCount > 0 ? 1 : 0.5,
            }}
            onClick={handleConfirm}
            disabled={!targetCode || sourceCount === 0}
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  )
}
