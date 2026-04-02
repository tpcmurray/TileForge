import { useState } from 'react'
import { useStore } from '../../store'
import { ColorPicker } from '../ColorPicker'
import { CP437Dialog } from '../CP437Dialog'
import { cp437ToUnicode } from '../../utils/cp437'
import type { RGBA } from '../../types'
import type { SpriteVisualData } from '../../types/sprite'
import { rgbaToCSS } from '../../rendering/tinting'

export function SpriteCellProperties({ npc }: { npc: SpriteVisualData }) {
  const paintMode = useStore((s) => s.spritePaintMode)
  const setPaintMode = useStore((s) => s.setSpritePaintMode)
  const currentGlyph = useStore((s) => s.spriteCurrentGlyph)
  const setCurrentGlyph = useStore((s) => s.setSpriteCurrentGlyph)
  const currentFg = useStore((s) => s.spriteCurrentFg)
  const setCurrentFg = useStore((s) => s.setSpriteCurrentFg)
  const currentBg = useStore((s) => s.spriteCurrentBg)
  const setCurrentBg = useStore((s) => s.setSpriteCurrentBg)
  const selectedCell = useStore((s) => s.spriteSelectedCell)

  const [showFgPicker, setShowFgPicker] = useState(false)
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [showGlyphPicker, setShowGlyphPicker] = useState(false)
  const [glyphInput, setGlyphInput] = useState('')

  // Get the cell data at the current selection for display
  let cellInfo: { glyph: string; fg: RGBA; bg: RGBA } | null = null
  if (selectedCell) {
    const grid =
      selectedCell.target === 'portrait'
        ? npc.portrait
        : npc.sprite[selectedCell.target]
    if (grid) {
      const cell = grid.rows[selectedCell.row]?.[selectedCell.col]
      if (cell) cellInfo = cell
    }
  }

  return (
    <div
      className="px-4 py-3 flex items-center gap-4 flex-wrap"
      style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-panel)' }}
    >
      {/* Paint mode toggle */}
      <div className="flex gap-1">
        {(['glyph', 'fg', 'bg'] as const).map((mode) => (
          <button
            key={mode}
            className="text-[10px] font-mono px-2.5 py-1 rounded cursor-pointer uppercase"
            style={{
              background: paintMode === mode ? 'var(--accent)' : 'var(--bg-surface)',
              color: paintMode === mode ? '#fff' : 'var(--text-dim)',
              border: `1px solid ${paintMode === mode ? 'var(--accent)' : 'var(--border)'}`,
            }}
            onClick={() => setPaintMode(mode)}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Glyph input + picker */}
      <div className="flex items-center gap-2">
        <div className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-dim)' }}>
          Glyph:
        </div>
        <div
          className="w-8 h-8 flex items-center justify-center rounded font-mono text-lg"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-bright)',
          }}
        >
          {currentGlyph === ' ' ? '\u00B7' : currentGlyph}
        </div>
        <input
          type="text"
          placeholder="Type"
          value={glyphInput}
          onChange={(e) => {
            const val = e.target.value
            setGlyphInput(val)
            if (val.length > 0) {
              const ch = val[val.length - 1]
              setCurrentGlyph(ch)
              setGlyphInput('')
            }
          }}
          className="w-12 text-center font-mono text-xs rounded px-1 py-1 outline-none"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        />
        <button
          className="text-[10px] font-mono px-2 py-1 rounded cursor-pointer"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-dim)',
          }}
          onClick={() => setShowGlyphPicker(true)}
          title="Open glyph picker"
        >
          CP437
        </button>
        <button
          className="text-[10px] font-mono px-2 py-1 rounded cursor-pointer"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-dim)',
          }}
          onClick={() => setCurrentGlyph(' ')}
          title="Set glyph to space (empty)"
        >
          Space
        </button>
      </div>

      {/* FG color */}
      <div className="flex items-center gap-2">
        <div className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-dim)' }}>
          FG:
        </div>
        <button
          className="w-8 h-8 rounded cursor-pointer"
          style={{
            background: rgbaToCSS(currentFg),
            border: '2px solid var(--border-light)',
          }}
          onClick={() => setShowFgPicker(true)}
          title="Pick foreground color"
        />
      </div>

      {/* BG color */}
      <div className="flex items-center gap-2">
        <div className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-dim)' }}>
          BG:
        </div>
        <button
          className="w-8 h-8 rounded cursor-pointer"
          style={{
            background:
              currentBg.a === 0
                ? 'repeating-conic-gradient(#444 0% 25%, #666 0% 50%) 50% / 8px 8px'
                : rgbaToCSS(currentBg),
            border: '2px solid var(--border-light)',
          }}
          onClick={() => setShowBgPicker(true)}
          title="Pick background color"
        />
      </div>

      {/* Selected cell info */}
      {cellInfo && selectedCell && (
        <div className="flex items-center gap-2 ml-auto">
          <div className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
            {selectedCell.target} [{selectedCell.row},{selectedCell.col}]
          </div>
          <div
            className="text-[10px] font-mono px-1 rounded"
            style={{ background: 'var(--bg-surface)', color: 'var(--text)' }}
          >
            '{cellInfo.glyph === ' ' ? '\u00B7' : cellInfo.glyph}'
          </div>
          <div
            className="w-4 h-4 rounded"
            style={{ background: rgbaToCSS(cellInfo.fg), border: '1px solid var(--border)' }}
            title={`FG: ${rgbaToCSS(cellInfo.fg)}`}
          />
          <div
            className="w-4 h-4 rounded"
            style={{
              background:
                cellInfo.bg.a === 0
                  ? 'repeating-conic-gradient(#444 0% 25%, #666 0% 50%) 50% / 6px 6px'
                  : rgbaToCSS(cellInfo.bg),
              border: '1px solid var(--border)',
            }}
            title={`BG: ${rgbaToCSS(cellInfo.bg)}`}
          />
          <button
            className="text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
            }}
            title="Pick this cell's glyph + colors"
            onClick={() => {
              setCurrentGlyph(cellInfo!.glyph)
              setCurrentFg(cellInfo!.fg)
              setCurrentBg(cellInfo!.bg)
            }}
          >
            Pick All
          </button>
        </div>
      )}

      {showFgPicker && (
        <ColorPicker
          color={currentFg}
          onChange={setCurrentFg}
          onClose={() => setShowFgPicker(false)}
        />
      )}
      {showBgPicker && (
        <ColorPicker
          color={currentBg}
          onChange={setCurrentBg}
          onClose={() => setShowBgPicker(false)}
          showTransparent
        />
      )}
      {showGlyphPicker && (
        <CP437Dialog
          currentGlyph={0}
          onSelect={(idx) => {
            setCurrentGlyph(cp437ToUnicode(idx))
            setShowGlyphPicker(false)
          }}
          onClose={() => setShowGlyphPicker(false)}
        />
      )}
    </div>
  )
}
