import { useStore } from '../../store'
import type { CutsceneStep } from '../../types/cutscene'

const ACTION_COLORS: Record<string, string> = {
  wait: '#6b7280',
  banner: '#f59e0b',
  play_sfx: '#8b5cf6',
  spawn_npc: '#10b981',
  spawn: '#10b981',
  camera_lock: '#3b82f6',
  camera_pan: '#3b82f6',
  camera_release: '#3b82f6',
  move: '#06b6d4',
  dialogue: '#ec4899',
  sprite_state: '#f97316',
  zone_transition: '#14b8a6',
  set_light: '#eab308',
  remove_light: '#eab308',
  set_flag: '#a855f7',
  despawn: '#ef4444',
  heal: '#22c55e',
}

function summarizeStep(step: CutsceneStep): string {
  const { action } = step
  switch (action) {
    case 'wait': return `${step.duration ?? '?'}s`
    case 'banner': return String(step.text ?? '')
    case 'play_sfx': return String(step.text ?? '')
    case 'spawn_npc':
    case 'spawn': return `${step.entity_id ?? step.mob_def_id ?? '?'} @ ${step.x},${step.y}`
    case 'camera_lock': return `${step.entity_type ?? ''} ${step.entity_id ?? ''}`
    case 'camera_pan': return `${step.x},${step.y} spd=${step.speed ?? '?'}`
    case 'camera_release': return ''
    case 'move': return `${step.entity_id ?? step.entity_type ?? '?'} → ${step.x},${step.y}`
    case 'dialogue': return `${step.dialogue_tree ?? '?'}`
    case 'sprite_state': return `${step.entity_id ?? '?'} → ${step.state ?? '?'}`
    case 'zone_transition': return `${step.zone_id ?? '?'} @ ${step.target_x},${step.target_y}`
    case 'set_light':
    case 'remove_light': return `${step.entity_id ?? step.entity_type ?? '?'} r=${step.radius ?? '?'}`
    case 'set_flag': return `${step.flag ?? '?'} = ${step.value ?? '?'}`
    case 'despawn': return `${step.entity_id ?? '?'}`
    case 'heal': return `${step.entity_id ?? '?'} +${step.amount ?? '?'}`
    default: return JSON.stringify(step).slice(0, 40)
  }
}

export function CutsceneStepList() {
  const cutscenes = useStore((s) => s.cutscenes)
  const selectedCutsceneId = useStore((s) => s.selectedCutsceneId)
  const selectedStepIndex = useStore((s) => s.selectedStepIndex)
  const selectStep = useStore((s) => s.selectStep)
  const addStep = useStore((s) => s.addStep)
  const moveStep = useStore((s) => s.moveStep)
  const deleteStep = useStore((s) => s.deleteStep)

  const cutscene = cutscenes.find((c) => c.id === selectedCutsceneId)

  if (!cutscene) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm font-mono" style={{ color: 'var(--text-dim)' }}>
          Select a cutscene
        </div>
      </div>
    )
  }

  const handleAddStep = (atIndex: number) => {
    addStep(cutscene.id, atIndex, { action: 'wait', duration: 1.0 })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ borderRight: '1px solid var(--border)' }}>
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}
      >
        <div
          className="text-[10px] font-mono font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-dim)' }}
        >
          Steps ({cutscene.steps.length})
        </div>
        <button
          className="px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer"
          style={{ color: 'var(--accent)', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
          onClick={() => handleAddStep(cutscene.steps.length)}
          title="Add step at end"
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {cutscene.steps.map((step, i) => {
          const selected = i === selectedStepIndex
          const color = ACTION_COLORS[step.action] ?? '#6b7280'
          return (
            <div key={i} className="flex flex-col">
              {/* Insert button between steps */}
              <button
                className="self-center h-3 w-12 text-[8px] font-mono rounded opacity-0 hover:opacity-100 cursor-pointer transition-opacity mb-0.5"
                style={{ color: 'var(--text-dim)', background: 'var(--bg-hover)' }}
                onClick={() => handleAddStep(i)}
                title={`Insert step at position ${i}`}
              >
                + insert
              </button>
              <button
                className="w-full text-left px-3 py-2 font-mono text-xs rounded cursor-pointer flex items-start gap-2"
                style={{
                  background: selected ? 'var(--accent-glow)' : 'var(--bg-panel)',
                  border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
                  color: selected ? 'var(--accent)' : 'var(--text)',
                }}
                onClick={() => selectStep(i)}
              >
                {/* Step number */}
                <span className="text-[9px] mt-0.5 shrink-0" style={{ color: 'var(--text-dim)', width: 16 }}>
                  {i}
                </span>
                {/* Action badge */}
                <span
                  className="px-1.5 py-0 text-[10px] rounded shrink-0 font-semibold"
                  style={{ background: color + '22', color, border: `1px solid ${color}44` }}
                >
                  {step.action}
                </span>
                {/* Summary */}
                <span className="truncate flex-1" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                  {summarizeStep(step)}
                </span>
                {/* Parallel badge */}
                {step.parallel && (
                  <span
                    className="px-1 py-0 text-[9px] rounded shrink-0"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-dim)' }}
                  >
                    ‖
                  </span>
                )}
                {/* Move/delete buttons */}
                <span className="flex gap-0.5 shrink-0">
                  {i > 0 && (
                    <span
                      className="px-1 py-0 text-[10px] rounded cursor-pointer hover:bg-[var(--bg-hover)]"
                      style={{ color: 'var(--text-dim)' }}
                      onClick={(e) => { e.stopPropagation(); moveStep(cutscene.id, i, i - 1) }}
                      title="Move up"
                    >
                      ↑
                    </span>
                  )}
                  {i < cutscene.steps.length - 1 && (
                    <span
                      className="px-1 py-0 text-[10px] rounded cursor-pointer hover:bg-[var(--bg-hover)]"
                      style={{ color: 'var(--text-dim)' }}
                      onClick={(e) => { e.stopPropagation(); moveStep(cutscene.id, i, i + 1) }}
                      title="Move down"
                    >
                      ↓
                    </span>
                  )}
                  <span
                    className="px-1 py-0 text-[10px] rounded cursor-pointer hover:bg-[var(--bg-hover)]"
                    style={{ color: 'var(--error)' }}
                    onClick={(e) => { e.stopPropagation(); deleteStep(cutscene.id, i) }}
                    title="Delete step"
                  >
                    ×
                  </span>
                </span>
              </button>
            </div>
          )
        })}
        {cutscene.steps.length === 0 && (
          <div className="text-center py-4 text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
            No steps. Click + to add one.
          </div>
        )}
      </div>
    </div>
  )
}
