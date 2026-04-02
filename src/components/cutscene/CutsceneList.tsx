import { useStore } from '../../store'
import type { Cutscene } from '../../types/cutscene'

export function CutsceneList() {
  const cutscenes = useStore((s) => s.cutscenes)
  const selectedId = useStore((s) => s.selectedCutsceneId)
  const selectCutscene = useStore((s) => s.selectCutscene)
  const addCutscene = useStore((s) => s.addCutscene)
  const deleteCutscene = useStore((s) => s.deleteCutscene)

  const handleAdd = () => {
    const id = prompt('New cutscene ID:')
    if (!id || id.trim() === '') return
    if (cutscenes.some((c) => c.id === id.trim())) {
      alert('A cutscene with that ID already exists.')
      return
    }
    const cs: Cutscene = {
      id: id.trim(),
      trigger: { type: 'zone_entry' },
      steps: [],
      rawJson: {},
    }
    addCutscene(cs)
  }

  const handleDelete = () => {
    if (!selectedId) return
    if (!confirm(`Delete cutscene "${selectedId}"?`)) return
    deleteCutscene(selectedId)
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: 200,
        minWidth: 200,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-panel)',
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="text-[10px] font-mono font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-dim)' }}
        >
          Cutscenes ({cutscenes.length})
        </div>
        <div className="flex gap-1">
          <button
            className="px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer"
            style={{ color: 'var(--accent)', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
            onClick={handleAdd}
            title="Add cutscene"
          >
            +
          </button>
          {selectedId && (
            <button
              className="px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer"
              style={{ color: 'var(--error)', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
              onClick={handleDelete}
              title="Delete cutscene"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {cutscenes.map((cs) => {
          const selected = cs.id === selectedId
          return (
            <button
              key={cs.id}
              className="w-full text-left px-3 py-1.5 font-mono text-xs cursor-pointer block"
              style={{
                background: selected ? 'var(--accent-glow)' : 'transparent',
                color: selected ? 'var(--accent)' : 'var(--text)',
                border: 'none',
                borderBottom: '1px solid var(--border)',
              }}
              onClick={() => selectCutscene(cs.id)}
            >
              <div className="font-semibold truncate">{cs.id}</div>
              <div className="truncate" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                {cs.trigger.type}{cs.trigger.zone_id ? `: ${cs.trigger.zone_id}` : ''}
                {cs.trigger.npc_id ? `: ${cs.trigger.npc_id}` : ''}
                {' · '}{cs.steps.length} step{cs.steps.length !== 1 ? 's' : ''}
              </div>
            </button>
          )
        })}
        {cutscenes.length === 0 && (
          <div className="px-3 py-4 text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
            No cutscenes loaded
          </div>
        )}
      </div>
    </div>
  )
}
