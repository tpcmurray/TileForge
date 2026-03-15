import { useState } from 'react'
import { useStore } from '../store'
import { cp437ToUnicode, cp437Name } from '../utils/cp437'
import { rgbaToCSS } from '../rendering/tinting'
import { TileEditor } from './TileEditor'
import { ColorPicker } from './ColorPicker'
import type { RGBA } from '../types'

export function ActiveTileDisplay() {
  const activeTileCode = useStore((s) => s.activeTileCode)
  const tiles = useStore((s) => s.tiles)
  const updateTile = useStore((s) => s.updateTile)
  const setActiveTile = useStore((s) => s.setActiveTile)
  const tile = activeTileCode ? tiles.get(activeTileCode) : null

  const [showEditor, setShowEditor] = useState(false)
  const [colorTarget, setColorTarget] = useState<'fg' | 'bg' | null>(null)

  if (!tile) {
    return (
      <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
        No tile selected
      </div>
    )
  }

  const ch = cp437ToUnicode(tile.glyph)
  const glyphNameStr = cp437Name(tile.glyph)

  const handleColorChange = (target: 'fg' | 'bg', color: RGBA) => {
    updateTile(tile.code, { ...tile, [target]: color })
  }

  return (
    <div>
      {/* Glyph preview box — click to edit */}
      <div
        className="flex items-center gap-3.5 p-2 rounded-md cursor-pointer border transition-colors"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
        onClick={() => setShowEditor(true)}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <div
          className="flex items-center justify-center rounded text-[32px] font-mono shrink-0"
          style={{
            width: 48,
            height: 48,
            background: rgbaToCSS(tile.bg),
            color: rgbaToCSS(tile.fg),
          }}
        >
          {ch}
        </div>
        <div className="text-[11px] leading-relaxed">
          <div>
            <strong style={{ color: 'var(--text-bright)', fontWeight: 600 }}>
              {tile.code}
            </strong>
            {' — '}
            {tile.name}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>
            CP437 #{tile.glyph} · {glyphNameStr}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>
            Click to edit tile
          </div>
        </div>
      </div>

      {/* Color swatches — click to open picker */}
      <div className="mt-2.5 flex flex-col gap-2">
        <ColorRow
          label="Foreground"
          color={rgbaToCSS(tile.fg)}
          rgba={tile.fg}
          onClick={() => setColorTarget('fg')}
        />
        <ColorRow
          label="Background"
          color={tile.bg.a === 0 ? undefined : rgbaToCSS(tile.bg)}
          rgba={tile.bg}
          transparent={tile.bg.a === 0}
          onClick={() => setColorTarget('bg')}
        />
      </div>

      {/* Tile editor dialog */}
      {showEditor && (
        <TileEditor
          tile={tile}
          existingCodes={new Set(tiles.keys())}
          onSave={(updated, originalCode) => {
            updateTile(originalCode ?? tile.code, updated)
            setActiveTile(updated.code)
            setShowEditor(false)
          }}
          onClose={() => setShowEditor(false)}
        />
      )}

      {/* Color picker shortcuts */}
      {colorTarget === 'fg' && (
        <ColorPicker
          color={tile.fg}
          onChange={(c) => handleColorChange('fg', c)}
          onClose={() => setColorTarget(null)}
        />
      )}
      {colorTarget === 'bg' && (
        <ColorPicker
          color={tile.bg}
          onChange={(c) => handleColorChange('bg', c)}
          onClose={() => setColorTarget(null)}
          showTransparent
        />
      )}
    </div>
  )
}

function ColorRow({
  label,
  color,
  rgba,
  transparent,
  onClick,
}: {
  label: string
  color?: string
  rgba: { r: number; g: number; b: number; a: number }
  transparent?: boolean
  onClick: () => void
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-1.5 py-1 rounded cursor-pointer transition-colors"
      style={{ background: 'transparent' }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div
        className="w-8 h-8 rounded shrink-0"
        style={{
          background: transparent
            ? 'repeating-conic-gradient(#444 0% 25%, #666 0% 50%) 50% / 12px 12px'
            : color,
          border: '2px solid var(--border-light)',
        }}
      />
      <div>
        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {label}
        </div>
        <div className="font-mono text-[11px]" style={{ color: 'var(--text)' }}>
          {rgba.r}, {rgba.g}, {rgba.b}, {rgba.a}
        </div>
      </div>
    </div>
  )
}
