import { useState, useEffect } from 'react'
import { cp437ToUnicode, cp437Name } from '../utils/cp437'

interface CP437DialogProps {
  currentGlyph: number
  onSelect: (glyph: number) => void
  onClose: () => void
}

export function CP437Dialog({ currentGlyph, onSelect, onClose }: CP437DialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const [hovered, setHovered] = useState<number | null>(null)

  const infoIndex = hovered ?? currentGlyph
  const infoName = cp437Name(infoIndex)

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-xl overflow-auto max-h-[85vh]"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-light)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          width: 640,
        }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center px-5 pt-4 pb-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="font-mono text-sm font-semibold" style={{ color: 'var(--text-bright)' }}>
            Code Page 437 — Select Character
          </div>
          <button
            className="px-1.5 py-0.5 rounded text-lg cursor-pointer"
            style={{ color: 'var(--text-dim)', background: 'none', border: 'none' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Grid */}
        <div className="p-5">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}>
            {Array.from({ length: 256 }, (_, i) => {
              const ch = cp437ToUnicode(i)
              const selected = i === currentGlyph
              return (
                <div
                  key={i}
                  className="flex items-center justify-center font-mono text-base rounded cursor-pointer border transition-all"
                  style={{
                    width: 36,
                    height: 36,
                    background: selected ? 'var(--accent)' : 'var(--bg-surface)',
                    color: selected ? '#fff' : 'var(--text)',
                    borderColor: hovered === i ? 'var(--accent)' : 'transparent',
                    transform: hovered === i ? 'scale(1.15)' : 'none',
                    zIndex: hovered === i ? 1 : 0,
                  }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect(i)}
                >
                  {i === 0 || i === 255 ? '' : ch}
                </div>
              )
            })}
          </div>

          {/* Info footer */}
          <div
            className="mt-3 text-center font-mono text-xs min-h-[20px]"
            style={{ color: 'var(--text-dim)' }}
          >
            Index: {infoIndex} (0x{infoIndex.toString(16).toUpperCase().padStart(2, '0')})
            {infoName ? ` — ${infoName}` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
