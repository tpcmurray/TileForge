import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { cp437ToUnicode } from '../utils/cp437'
import { rgbaToCSS } from '../rendering/tinting'
import type { TileDefinition } from '../types'

export function TilePalette() {
  const tiles = useStore((s) => s.tiles)
  const activeTileCode = useStore((s) => s.activeTileCode)
  const setActiveTile = useStore((s) => s.setActiveTile)
  const [search, setSearch] = useState('')

  const tileList = useMemo(() => [...tiles.values()], [tiles])

  // Group by category
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

  if (tileList.length === 0) {
    return (
      <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
        No registry loaded
      </div>
    )
  }

  return (
    <div>
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
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PaletteTile({
  tile,
  selected,
  onSelect,
}: {
  tile: TileDefinition
  selected: boolean
  onSelect: () => void
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
