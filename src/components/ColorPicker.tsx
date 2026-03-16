import { useState, useEffect, useRef, useCallback } from 'react'
import type { RGBA } from '../types'

interface ColorPickerProps {
  color: RGBA
  onChange: (color: RGBA) => void
  onClose: () => void
  showTransparent?: boolean
}

export function ColorPicker({ color, onChange, onClose, showTransparent }: ColorPickerProps) {
  const [r, setR] = useState(color.r)
  const [g, setG] = useState(color.g)
  const [b, setB] = useState(color.b)
  const [a, setA] = useState(color.a)
  const [hue, setHue] = useState(() => rgbToHue(color.r, color.g, color.b))
  const satBrightRef = useRef<HTMLCanvasElement>(null)
  const dragging = useRef(false)

  useEffect(() => {
    drawSatBright()
  }, [hue])

  const drawSatBright = useCallback(() => {
    const canvas = satBrightRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height

    // Base hue color
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = x / w
        const v = 1 - y / h
        const [cr, cg, cb] = hsvToRgb(hue, s, v)
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }, [hue])

  const pickFromCanvas = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = satBrightRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      const [nr, ng, nb] = hsvToRgb(hue, x, 1 - y)
      setR(nr); setG(ng); setB(nb)
      onChange({ r: nr, g: ng, b: nb, a })
    },
    [hue, a, onChange],
  )

  const emit = useCallback(
    (nr: number, ng: number, nb: number, na: number) => {
      onChange({ r: nr, g: ng, b: nb, a: na })
    },
    [onChange],
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
          width: 320,
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="font-mono text-sm font-semibold" style={{ color: 'var(--text-bright)' }}>
            Color Picker
          </div>
          <button
            className="px-1.5 py-0.5 rounded text-lg cursor-pointer"
            style={{ color: 'var(--text-dim)', background: 'none', border: 'none' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Saturation/Brightness square */}
        <canvas
          ref={satBrightRef}
          width={256}
          height={160}
          className="w-full rounded cursor-crosshair mb-3"
          style={{ height: 160 }}
          onMouseDown={(e) => { dragging.current = true; pickFromCanvas(e) }}
          onMouseMove={(e) => { if (dragging.current) pickFromCanvas(e) }}
          onMouseUp={() => { dragging.current = false }}
          onMouseLeave={() => { dragging.current = false }}
        />

        {/* Hue slider */}
        <div className="mb-3">
          <label className="text-[10px] font-mono uppercase mb-1 block" style={{ color: 'var(--text-dim)' }}>
            Hue
          </label>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(e) => {
              const h = parseInt(e.target.value)
              setHue(h)
              const [nr, ng, nb] = hsvToRgb(h, 1, 1)
              setR(nr); setG(ng); setB(nb)
              emit(nr, ng, nb, a)
            }}
            className="w-full"
            style={{ accentColor: 'var(--accent)' }}
          />
        </div>

        {/* Alpha slider */}
        <div className="mb-3">
          <label className="text-[10px] font-mono uppercase mb-1 block" style={{ color: 'var(--text-dim)' }}>
            Alpha
          </label>
          <input
            type="range"
            min={0}
            max={255}
            value={a}
            onChange={(e) => {
              const na = parseInt(e.target.value)
              setA(na)
              emit(r, g, b, na)
            }}
            className="w-full"
            style={{ accentColor: 'var(--accent)' }}
          />
        </div>

        {/* RGBA inputs */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'R', val: r, set: setR, idx: 0 },
            { label: 'G', val: g, set: setG, idx: 1 },
            { label: 'B', val: b, set: setB, idx: 2 },
            { label: 'A', val: a, set: setA, idx: 3 },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-[10px] font-mono block mb-0.5" style={{ color: 'var(--text-dim)' }}>
                {label}
              </label>
              <input
                type="number"
                min={0}
                max={255}
                value={val}
                onChange={(e) => {
                  const n = Math.max(0, Math.min(255, parseInt(e.target.value) || 0))
                  set(n)
                  const nr = label === 'R' ? n : r
                  const ng = label === 'G' ? n : g
                  const nb = label === 'B' ? n : b
                  const na = label === 'A' ? n : a
                  emit(nr, ng, nb, na)
                }}
                className="w-full text-center font-mono text-xs rounded px-1 py-1 outline-none"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>
          ))}
        </div>

        {/* Hex RGB input */}
        <div className="mb-3">
          <label className="text-[10px] font-mono uppercase mb-1 block" style={{ color: 'var(--text-dim)' }}>
            Hex
          </label>
          <input
            type="text"
            value={`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`}
            onChange={(e) => {
              const parsed = parseHexColor(e.target.value)
              if (!parsed) return
              const [nr, ng, nb] = parsed
              setR(nr); setG(ng); setB(nb)
              setHue(rgbToHue(nr, ng, nb))
              emit(nr, ng, nb, a)
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text').trim()
              const parsed = parseHexColor(text)
              if (parsed) {
                e.preventDefault()
                const [nr, ng, nb] = parsed
                setR(nr); setG(ng); setB(nb)
                setHue(rgbToHue(nr, ng, nb))
                emit(nr, ng, nb, a)
              }
            }}
            className="w-full font-mono text-xs rounded px-2 py-1 outline-none"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            spellCheck={false}
          />
        </div>

        {/* Preview + transparent button */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded"
            style={{
              background: a === 0
                ? 'repeating-conic-gradient(#444 0% 25%, #666 0% 50%) 50% / 12px 12px'
                : `rgba(${r},${g},${b},${a / 255})`,
              border: '2px solid var(--border-light)',
            }}
          />
          {showTransparent && (
            <button
              className="text-xs px-3 py-1.5 rounded cursor-pointer"
              style={{
                background: a === 0 ? 'var(--accent-glow)' : 'var(--bg-surface)',
                border: `1px solid ${a === 0 ? 'var(--accent)' : 'var(--border)'}`,
                color: a === 0 ? 'var(--accent)' : 'var(--text)',
              }}
              onClick={() => {
                setA(0)
                emit(r, g, b, 0)
              }}
            >
              Transparent
            </button>
          )}
          <div className="flex-1" />
          <button
            className="text-xs px-4 py-1.5 rounded cursor-pointer"
            style={{
              background: 'var(--accent)',
              border: '1px solid var(--accent)',
              color: '#fff',
            }}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function rgbToHue(r: number, g: number, b: number): number {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const d = max - min
  if (d === 0) return 0
  let h = 0
  if (max === rn) h = ((gn - bn) / d + 6) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return Math.round(h * 60)
}

/** Parse hex color strings: #RGB, #RRGGBB, or without # */
function parseHexColor(str: string): [number, number, number] | null {
  const s = str.replace(/^#/, '').trim()
  if (/^[0-9a-f]{6}$/i.test(s)) {
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
  }
  if (/^[0-9a-f]{3}$/i.test(s)) {
    return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)]
  }
  return null
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}
