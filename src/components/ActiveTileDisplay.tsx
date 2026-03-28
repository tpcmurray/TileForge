import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { cp437ToUnicode, cp437Name } from '../utils/cp437'
import { rgbaToCSS } from '../rendering/tinting'
import { generateUniqueCode } from '../utils/codeGen'
import { TileEditor } from './TileEditor'
import { ColorPicker } from './ColorPicker'
import { CP437Dialog } from './CP437Dialog'
import type { RGBA } from '../types'

export function ActiveTileDisplay() {
  const activeTileCode = useStore((s) => s.activeTileCode)
  const tiles = useStore((s) => s.tiles)
  const updateTile = useStore((s) => s.updateTile)
  const addTile = useStore((s) => s.addTile)
  const setActiveTile = useStore((s) => s.setActiveTile)
  const setOnBeforePaint = useStore((s) => s.setOnBeforePaint)
  const tile = activeTileCode ? tiles.get(activeTileCode) : null

  // Registry mode state
  const [showEditor, setShowEditor] = useState(false)
  const [colorTarget, setColorTarget] = useState<'fg' | 'bg' | null>(null)

  // Mode toggle
  const [mode, setMode] = useState<'registry' | 'quickpaint'>('registry')

  // Quick Paint state
  const [qpGlyph, setQpGlyph] = useState(1)
  const [qpFg, setQpFg] = useState<RGBA>({ r: 255, g: 255, b: 255, a: 255 })
  const [qpBg, setQpBg] = useState<RGBA>({ r: 0, g: 0, b: 0, a: 255 })
  const [qpWalkable, setQpWalkable] = useState(true)
  const [qpTransparent, setQpTransparent] = useState(false)
  const [qpAbove, setQpAbove] = useState(false)
  const [qpMaterialized, setQpMaterialized] = useState(false)
  const [qpCreatedCode, setQpCreatedCode] = useState<string | null>(null)
  const [showGlyphPicker, setShowGlyphPicker] = useState(false)
  const [qpColorTarget, setQpColorTarget] = useState<'fg' | 'bg' | null>(null)

  // Reset materialized when any QP property changes
  const qpVersion = useRef(0)
  useEffect(() => {
    // Skip the initial render
    if (qpVersion.current === 0) {
      qpVersion.current = 1
      return
    }
    setQpMaterialized(false)
    setQpCreatedCode(null)
  }, [qpGlyph, qpFg, qpBg, qpWalkable, qpTransparent, qpAbove])

  // Register/clear onBeforePaint callback
  useEffect(() => {
    if (mode === 'quickpaint' && !qpMaterialized) {
      const materialize = () => {
        const currentTiles = useStore.getState().tiles
        const code = generateUniqueCode(currentTiles)
        const newTile = {
          code,
          name: `QP ${cp437Name(qpGlyph) || 'Tile'}`,
          glyph: qpGlyph,
          variants: [],
          fg: { ...qpFg },
          bg: { ...qpBg },
          walkable: qpWalkable,
          transparent: qpTransparent,
          lightPass: qpTransparent,
          above: qpAbove,
          speedMod: 1.0,
          lightRadius: 0,
          category: 'Quick Paint',
        }
        useStore.getState().addTile(newTile)
        useStore.getState().setActiveTile(code)
        setQpMaterialized(true)
        setQpCreatedCode(code)
        // Clear callback so it only fires once per config
        useStore.getState().setOnBeforePaint(null)
      }
      setOnBeforePaint(materialize)
      return () => setOnBeforePaint(null)
    }
    setOnBeforePaint(null)
  }, [mode, qpMaterialized, qpGlyph, qpFg, qpBg, qpWalkable, qpTransparent, qpAbove, setOnBeforePaint, addTile, setActiveTile])

  // Pre-populate QP from current tile when switching to quickpaint
  const handleModeSwitch = (newMode: 'registry' | 'quickpaint') => {
    if (newMode === 'quickpaint' && tile) {
      setQpGlyph(tile.glyph)
      setQpFg({ ...tile.fg })
      setQpBg({ ...tile.bg })
      setQpWalkable(tile.walkable)
      setQpTransparent(tile.transparent)
      setQpAbove(tile.above)
      setQpMaterialized(false)
      setQpCreatedCode(null)
      qpVersion.current = 0 // Reset so the effect doesn't immediately fire
    }
    setMode(newMode)
  }

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex mb-2.5 rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <button
          className="flex-1 text-[11px] py-1 px-2 transition-colors"
          style={{
            background: mode === 'registry' ? 'var(--accent)' : 'var(--bg-surface)',
            color: mode === 'registry' ? '#fff' : 'var(--text-dim)',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={() => handleModeSwitch('registry')}
        >
          Registry
        </button>
        <button
          className="flex-1 text-[11px] py-1 px-2 transition-colors"
          style={{
            background: mode === 'quickpaint' ? 'var(--accent)' : 'var(--bg-surface)',
            color: mode === 'quickpaint' ? '#fff' : 'var(--text-dim)',
            border: 'none',
            borderLeft: '1px solid var(--border)',
            cursor: 'pointer',
          }}
          onClick={() => handleModeSwitch('quickpaint')}
        >
          Quick Paint
        </button>
      </div>

      {mode === 'registry' ? (
        <RegistryMode
          tile={tile ?? null}
          tiles={tiles}
          updateTile={updateTile}
          setActiveTile={setActiveTile}
          showEditor={showEditor}
          setShowEditor={setShowEditor}
          colorTarget={colorTarget}
          setColorTarget={setColorTarget}
        />
      ) : (
        <QuickPaintMode
          qpGlyph={qpGlyph}
          qpFg={qpFg}
          qpBg={qpBg}
          qpWalkable={qpWalkable}
          qpTransparent={qpTransparent}
          qpAbove={qpAbove}
          qpMaterialized={qpMaterialized}
          qpCreatedCode={qpCreatedCode}
          setQpGlyph={setQpGlyph}
          setQpFg={setQpFg}
          setQpBg={setQpBg}
          setQpWalkable={setQpWalkable}
          setQpTransparent={setQpTransparent}
          setQpAbove={setQpAbove}
          showGlyphPicker={showGlyphPicker}
          setShowGlyphPicker={setShowGlyphPicker}
          qpColorTarget={qpColorTarget}
          setQpColorTarget={setQpColorTarget}
        />
      )}
    </div>
  )
}

/* ── Registry Mode (original behavior) ── */

function RegistryMode({
  tile,
  tiles,
  updateTile,
  setActiveTile,
  showEditor,
  setShowEditor,
  colorTarget,
  setColorTarget,
}: {
  tile: import('../types').TileDefinition | null
  tiles: Map<string, any>
  updateTile: (code: string, tile: any) => void
  setActiveTile: (code: string) => void
  showEditor: boolean
  setShowEditor: (v: boolean) => void
  colorTarget: 'fg' | 'bg' | null
  setColorTarget: (v: 'fg' | 'bg' | null) => void
}) {
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
    <>
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
            width: 32,
            height: 64,
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
            {tile.variants && tile.variants.length > 0 && ` + ${tile.variants.length} variant${tile.variants.length > 1 ? 's' : ''}`}
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
    </>
  )
}

/* ── Quick Paint Mode ── */

function QuickPaintMode({
  qpGlyph,
  qpFg,
  qpBg,
  qpWalkable,
  qpTransparent,
  qpAbove,
  qpMaterialized,
  qpCreatedCode,
  setQpGlyph,
  setQpFg,
  setQpBg,
  setQpWalkable,
  setQpTransparent,
  setQpAbove,
  showGlyphPicker,
  setShowGlyphPicker,
  qpColorTarget,
  setQpColorTarget,
}: {
  qpGlyph: number
  qpFg: RGBA
  qpBg: RGBA
  qpWalkable: boolean
  qpTransparent: boolean
  qpAbove: boolean
  qpMaterialized: boolean
  qpCreatedCode: string | null
  setQpGlyph: (g: number) => void
  setQpFg: (c: RGBA) => void
  setQpBg: (c: RGBA) => void
  setQpWalkable: (v: boolean) => void
  setQpTransparent: (v: boolean) => void
  setQpAbove: (v: boolean) => void
  showGlyphPicker: boolean
  setShowGlyphPicker: (v: boolean) => void
  qpColorTarget: 'fg' | 'bg' | null
  setQpColorTarget: (v: 'fg' | 'bg' | null) => void
}) {
  const ch = cp437ToUnicode(qpGlyph)
  const glyphNameStr = cp437Name(qpGlyph)

  return (
    <>
      {/* Glyph preview — click to pick glyph */}
      <div
        className="flex items-center gap-3.5 p-2 rounded-md cursor-pointer border transition-colors"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
        onClick={() => setShowGlyphPicker(true)}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <div
          className="flex items-center justify-center rounded text-[32px] font-mono shrink-0"
          style={{
            width: 32,
            height: 64,
            background: rgbaToCSS(qpBg),
            color: rgbaToCSS(qpFg),
          }}
        >
          {ch}
        </div>
        <div className="text-[11px] leading-relaxed">
          <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>
            CP437 #{qpGlyph} · {glyphNameStr}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>
            Click to change glyph
          </div>
        </div>
      </div>

      {/* Color swatches */}
      <div className="mt-2.5 flex flex-col gap-2">
        <ColorRow
          label="Foreground"
          color={rgbaToCSS(qpFg)}
          rgba={qpFg}
          onClick={() => setQpColorTarget('fg')}
        />
        <ColorRow
          label="Background"
          color={qpBg.a === 0 ? undefined : rgbaToCSS(qpBg)}
          rgba={qpBg}
          transparent={qpBg.a === 0}
          onClick={() => setQpColorTarget('bg')}
        />
      </div>

      {/* Properties */}
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 px-1">
        <label className="flex items-center gap-1 text-[11px] cursor-pointer" style={{ color: 'var(--text)' }}>
          <input
            type="checkbox"
            checked={qpWalkable}
            onChange={(e) => setQpWalkable(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Walkable
        </label>
        <label className="flex items-center gap-1 text-[11px] cursor-pointer" style={{ color: 'var(--text)' }}>
          <input
            type="checkbox"
            checked={qpTransparent}
            onChange={(e) => setQpTransparent(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Transparent
        </label>
        <label className="flex items-center gap-1 text-[11px] cursor-pointer" style={{ color: 'var(--text)' }}>
          <input
            type="checkbox"
            checked={qpAbove}
            onChange={(e) => setQpAbove(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Above
        </label>
      </div>

      {/* Status */}
      <div className="mt-2 px-1 text-[10px]" style={{ color: 'var(--text-dim)' }}>
        {qpMaterialized && qpCreatedCode
          ? <>Created as <strong style={{ color: 'var(--accent)' }}>{qpCreatedCode}</strong></>
          : 'Paint on map to create tile'
        }
      </div>

      {/* Glyph picker dialog */}
      {showGlyphPicker && (
        <CP437Dialog
          currentGlyph={qpGlyph}
          onSelect={(g) => {
            setQpGlyph(g)
            setShowGlyphPicker(false)
          }}
          onClose={() => setShowGlyphPicker(false)}
        />
      )}

      {/* Color pickers */}
      {qpColorTarget === 'fg' && (
        <ColorPicker
          color={qpFg}
          onChange={setQpFg}
          onClose={() => setQpColorTarget(null)}
        />
      )}
      {qpColorTarget === 'bg' && (
        <ColorPicker
          color={qpBg}
          onChange={setQpBg}
          onClose={() => setQpColorTarget(null)}
          showTransparent
        />
      )}
    </>
  )
}

/* ── Shared ColorRow component ── */

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
