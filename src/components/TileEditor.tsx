import { useState } from 'react'
import type { TileDefinition, RGBA } from '../types'
import { cp437ToUnicode } from '../utils/cp437'
import { rgbaToCSS } from '../rendering/tinting'
import { CP437Dialog } from './CP437Dialog'
import { ColorPicker } from './ColorPicker'

interface TileEditorProps {
  tile: TileDefinition | null // null = new tile
  existingCodes: Set<string>
  onSave: (tile: TileDefinition, originalCode: string | null) => void
  onClose: () => void
}

export function TileEditor({ tile, existingCodes, onSave, onClose }: TileEditorProps) {
  const isNew = tile === null

  const [code, setCode] = useState(tile?.code ?? '')
  const [name, setName] = useState(tile?.name ?? '')
  const [glyph, setGlyph] = useState(tile?.glyph ?? 1)
  const [fg, setFg] = useState<RGBA>(tile?.fg ?? { r: 255, g: 255, b: 255, a: 255 })
  const [bg, setBg] = useState<RGBA>(tile?.bg ?? { r: 0, g: 0, b: 0, a: 255 })
  const [walkable, setWalkable] = useState(tile?.walkable ?? true)
  const [transparent, setTransparent] = useState(tile?.transparent ?? true)
  const [lightPass, setLightPass] = useState(tile?.lightPass ?? true)
  const [above, setAbove] = useState(tile?.above ?? false)
  const [speedMod, setSpeedMod] = useState(tile?.speedMod ?? 1.0)
  const [lightRadius, setLightRadius] = useState(tile?.lightRadius ?? 0)
  const [variants, setVariants] = useState<{ glyph: number; percent: number }[]>(tile?.variants ?? [])

  const [showCP437, setShowCP437] = useState(false)
  const [variantCP437Index, setVariantCP437Index] = useState<number | null>(null)
  const [colorTarget, setColorTarget] = useState<'fg' | 'bg' | null>(null)

  const codeError =
    code.length !== 2
      ? 'Must be exactly 2 characters'
      : (isNew || code !== tile?.code) && existingCodes.has(code)
        ? 'Code already exists'
        : null

  const handleSave = () => {
    if (codeError) return
    onSave(
      { code, name, glyph, variants, fg, bg, walkable, transparent, lightPass, above, speedMod, lightRadius },
      tile?.code ?? null,
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center z-40"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="rounded-xl"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-light)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            width: 500,
          }}
        >
          {/* Header */}
          <div
            className="flex justify-between items-center px-5 pt-4 pb-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="font-mono text-sm font-semibold" style={{ color: 'var(--text-bright)' }}>
              {isNew ? 'New Tile' : 'Edit Tile'}
            </div>
            <button
              className="px-1.5 py-0.5 rounded text-lg cursor-pointer"
              style={{ color: 'var(--text-dim)', background: 'none', border: 'none' }}
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            {/* Live preview */}
            <div
              className="flex items-center justify-center rounded-lg font-mono mb-4 mx-auto"
              style={{
                width: 48,
                height: 96,
                fontSize: 40,
                background: rgbaToCSS(bg),
                color: rgbaToCSS(fg),
                border: '1px solid var(--border)',
              }}
            >
              {cp437ToUnicode(glyph)}
            </div>

            {/* Code + Name */}
            <Row label="Code">
              <input
                className="font-mono text-center text-sm rounded px-2 py-1.5 outline-none"
                style={{
                  width: 60,
                  background: 'var(--bg-surface)',
                  border: `1px solid ${codeError ? 'var(--red)' : 'var(--border)'}`,
                  color: 'var(--text)',
                }}
                maxLength={2}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <span className="font-mono text-[10px] mx-2" style={{ color: 'var(--text-dim)' }}>Name</span>
              <input
                className="flex-1 text-sm rounded px-2 py-1.5 outline-none"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Row>
            {codeError && (
              <div className="text-[10px] mb-2 -mt-1 pl-[102px]" style={{ color: 'var(--red)' }}>
                {codeError}
              </div>
            )}

            {/* Glyph */}
            <Row label="Glyph">
              <button
                className="flex items-center justify-center font-mono text-xl rounded cursor-pointer"
                style={{
                  width: 40,
                  height: 40,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                onClick={() => setShowCP437(true)}
              >
                {cp437ToUnicode(glyph)}
              </button>
              <span className="font-mono text-[11px] ml-2" style={{ color: 'var(--text-dim)' }}>
                CP437 #{glyph}
              </span>
            </Row>

            {/* Glyph Variants */}
            <Row label="Variants">
              <div className="flex flex-col gap-1.5 flex-1">
                {variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      className="flex items-center justify-center font-mono text-sm rounded cursor-pointer shrink-0"
                      style={{
                        width: 28,
                        height: 28,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                      }}
                      onClick={() => setVariantCP437Index(i)}
                    >
                      {cp437ToUnicode(v.glyph)}
                    </button>
                    <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--text-dim)' }}>
                      #{v.glyph}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={v.percent}
                      onChange={(e) => {
                        const updated = [...variants]
                        updated[i] = { ...v, percent: Math.max(1, Math.min(100, parseInt(e.target.value) || 1)) }
                        setVariants(updated)
                      }}
                      className="font-mono text-center text-[11px] rounded px-1 py-0.5 outline-none"
                      style={{
                        width: 44,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                      }}
                    />
                    <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>%</span>
                    <button
                      className="text-[11px] px-1.5 py-0.5 rounded cursor-pointer"
                      style={{ color: 'var(--red)', background: 'none', border: 'none' }}
                      onClick={() => setVariants(variants.filter((_, j) => j !== i))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  className="text-[11px] px-2 py-1 rounded cursor-pointer self-start"
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--border-light)',
                    color: 'var(--text-dim)',
                  }}
                  onClick={() => setVariants([...variants, { glyph: 1, percent: 5 }])}
                >
                  + Add Variant
                </button>
              </div>
            </Row>

            {/* Foreground */}
            <Row label="Foreground">
              <button
                className="w-8 h-8 rounded shrink-0 cursor-pointer"
                style={{ background: rgbaToCSS(fg), border: '2px solid var(--border-light)' }}
                onClick={() => setColorTarget('fg')}
              />
              <span className="font-mono text-[11px] ml-2" style={{ color: 'var(--text-dim)' }}>
                rgba({fg.r}, {fg.g}, {fg.b}, {fg.a})
              </span>
            </Row>

            {/* Background */}
            <Row label="Background">
              <button
                className="w-8 h-8 rounded shrink-0 cursor-pointer"
                style={{
                  background: bg.a === 0
                    ? 'repeating-conic-gradient(#444 0% 25%, #666 0% 50%) 50% / 12px 12px'
                    : rgbaToCSS(bg),
                  border: '2px solid var(--border-light)',
                }}
                onClick={() => setColorTarget('bg')}
              />
              <span className="font-mono text-[11px] ml-2" style={{ color: 'var(--text-dim)' }}>
                rgba({bg.r}, {bg.g}, {bg.b}, {bg.a})
              </span>
            </Row>

            {/* Checkboxes */}
            <Row label="Properties">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer mr-4" style={{ color: 'var(--text)' }}>
                <input type="checkbox" checked={walkable} onChange={(e) => setWalkable(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                Walkable
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer mr-4" style={{ color: 'var(--text)' }}>
                <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                Transparent
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer mr-4" style={{ color: 'var(--text)' }}>
                <input type="checkbox" checked={lightPass} onChange={(e) => setLightPass(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                Light Pass
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text)' }}>
                <input type="checkbox" checked={above} onChange={(e) => setAbove(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                Above
              </label>
            </Row>

            {/* Numbers */}
            <Row label="Speed Mod">
              <input
                type="number"
                step={0.1}
                min={0}
                value={speedMod}
                onChange={(e) => setSpeedMod(parseFloat(e.target.value) || 0)}
                className="font-mono text-center text-xs rounded px-2 py-1.5 outline-none"
                style={{
                  width: 70,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
              <span className="font-mono text-[10px] mx-3" style={{ color: 'var(--text-dim)' }}>Light Radius</span>
              <input
                type="number"
                min={0}
                value={lightRadius}
                onChange={(e) => setLightRadius(parseInt(e.target.value) || 0)}
                className="font-mono text-center text-xs rounded px-2 py-1.5 outline-none"
                style={{
                  width: 70,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </Row>
          </div>

          {/* Footer */}
          <div
            className="flex justify-end gap-2 px-5 py-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              className="text-xs px-4 py-1.5 rounded cursor-pointer"
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
                background: codeError ? 'var(--bg-surface)' : 'var(--accent)',
                border: `1px solid ${codeError ? 'var(--border)' : 'var(--accent)'}`,
                color: codeError ? 'var(--text-dim)' : '#fff',
                cursor: codeError ? 'not-allowed' : 'pointer',
              }}
              onClick={handleSave}
              disabled={!!codeError}
            >
              {isNew ? 'Create Tile' : 'Save Tile'}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-dialogs */}
      {showCP437 && (
        <CP437Dialog
          currentGlyph={glyph}
          onSelect={(g) => { setGlyph(g); setShowCP437(false) }}
          onClose={() => setShowCP437(false)}
        />
      )}
      {variantCP437Index !== null && (
        <CP437Dialog
          currentGlyph={variants[variantCP437Index]?.glyph ?? 0}
          onSelect={(g) => {
            const updated = [...variants]
            updated[variantCP437Index] = { ...updated[variantCP437Index], glyph: g }
            setVariants(updated)
            setVariantCP437Index(null)
          }}
          onClose={() => setVariantCP437Index(null)}
        />
      )}
      {colorTarget === 'fg' && (
        <ColorPicker
          color={fg}
          onChange={setFg}
          onClose={() => setColorTarget(null)}
        />
      )}
      {colorTarget === 'bg' && (
        <ColorPicker
          color={bg}
          onChange={setBg}
          onClose={() => setColorTarget(null)}
          showTransparent
        />
      )}
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div
        className="font-mono text-[11px] font-semibold uppercase tracking-wide shrink-0"
        style={{ color: 'var(--text-dim)', width: 90 }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
