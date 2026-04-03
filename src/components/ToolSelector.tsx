import { useStore } from '../store'
import type { ToolType } from '../types'
import { useEffect } from 'react'

const tools: { type: ToolType; label: string; icon: string; key: string }[] = [
  { type: 'paint', label: 'Paint', icon: '✏', key: 'b' },
  { type: 'erase', label: 'Erase', icon: '⌫', key: 'e' },
  { type: 'pick', label: 'Pick', icon: '◉', key: 'i' },
  { type: 'copy', label: 'Copy', icon: '⧉', key: 'c' },
  { type: 'paste', label: 'Paste', icon: '⎘', key: 'v' },
  { type: 'entity', label: 'Entity', icon: '⚑', key: 'n' },
]

export function ToolSelector() {
  const activeTool = useStore((s) => s.activeTool)
  const setTool = useStore((s) => s.setTool)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.ctrlKey || e.metaKey) return
      const tool = tools.find((t) => t.key === e.key.toLowerCase())
      if (tool) setTool(tool.type)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setTool])

  return (
    <div className="grid grid-cols-3 gap-1">
      {tools.map((t) => {
        const active = activeTool === t.type
        return (
          <button
            key={t.type}
            title={`${t.label} (${t.key.toUpperCase()})`}
            className="flex flex-col items-center gap-1 py-2 px-1 rounded-md cursor-pointer border transition-all"
            style={{
              background: active ? 'var(--accent-glow)' : 'var(--bg-surface)',
              borderColor: active ? 'var(--accent)' : 'var(--border)',
              color: active ? 'var(--accent)' : 'var(--text-dim)',
            }}
            onClick={() => setTool(t.type)}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide">
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
