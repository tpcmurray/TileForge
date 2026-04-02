import { useStore } from '../../store'
import type { CutsceneStep, CutsceneTrigger } from '../../types/cutscene'

const ACTION_TYPES = [
  'wait', 'banner', 'play_sfx', 'spawn_npc', 'spawn',
  'camera_lock', 'camera_pan', 'camera_release',
  'move', 'dialogue', 'sprite_state',
  'zone_transition', 'set_light', 'remove_light',
  'set_flag', 'despawn', 'heal',
]

const TRIGGER_TYPES = [
  'zone_entry', 'npc_interact', 'quest_stage', 'trigger_zone',
  'battle_start', 'battle_end_death', 'battle_end_plot_armor',
]

export function CutsceneStepEditor() {
  const cutscenes = useStore((s) => s.cutscenes)
  const selectedCutsceneId = useStore((s) => s.selectedCutsceneId)
  const selectedStepIndex = useStore((s) => s.selectedStepIndex)
  const updateStep = useStore((s) => s.updateStep)
  const updateTrigger = useStore((s) => s.updateCutsceneTrigger)

  const cutscene = cutscenes.find((c) => c.id === selectedCutsceneId)
  const step = cutscene && selectedStepIndex != null ? cutscene.steps[selectedStepIndex] : null

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ width: 320, minWidth: 320, background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)' }}
    >
      {/* Trigger editor — always shown when cutscene is selected */}
      {cutscene && (
        <>
          <div
            className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide"
            style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}
          >
            Trigger
          </div>
          <div className="p-3 flex flex-col gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <TriggerFields trigger={cutscene.trigger} onChange={(t) => updateTrigger(cutscene.id, t)} />
          </div>
        </>
      )}

      {/* Step editor */}
      {step && selectedStepIndex != null && cutscene ? (
        <>
          <div
            className="px-3 py-2 font-mono text-xs font-semibold"
            style={{ borderBottom: '1px solid var(--border)', color: 'var(--accent)' }}
          >
            Step {selectedStepIndex}
          </div>
          <div className="p-3 flex flex-col gap-2">
            <Field label="Action">
              <select
                className="w-full px-2 py-1 text-xs font-mono rounded"
                style={{ background: 'var(--bg-dark)', color: 'var(--text)', border: '1px solid var(--border)' }}
                value={step.action}
                onChange={(e) => updateStep(cutscene.id, selectedStepIndex, { action: e.target.value })}
              >
                {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Parallel">
              <label className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={!!step.parallel}
                  onChange={(e) => {
                    const updated = { ...step }
                    if (e.target.checked) updated.parallel = true
                    else delete updated.parallel
                    updateStep(cutscene.id, selectedStepIndex, updated)
                  }}
                />
                Run in parallel
              </label>
            </Field>
            <StepTypeFields
              step={step}
              onChange={(updated) => updateStep(cutscene.id, selectedStepIndex, updated)}
            />
          </div>
        </>
      ) : !cutscene ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>Select a cutscene</div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>Select a step to edit</div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-mono font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-dim)' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string | number | undefined
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <Field label={label}>
      <input
        className="w-full px-2 py-1 text-xs font-mono rounded"
        style={{ background: 'var(--bg-dark)', color: 'var(--text)', border: '1px solid var(--border)' }}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

function StepTypeFields({
  step,
  onChange,
}: {
  step: CutsceneStep
  onChange: (s: CutsceneStep) => void
}) {
  const set = (key: string, val: unknown) => {
    const updated = { ...step }
    if (val === '' || val === undefined) {
      delete updated[key]
    } else {
      updated[key] = val
    }
    onChange(updated)
  }

  const setNum = (key: string, val: string) => {
    if (val === '') { set(key, undefined); return }
    const n = Number(val)
    if (!isNaN(n)) set(key, n)
  }

  switch (step.action) {
    case 'wait':
      return <TextInput label="Duration (s)" value={step.duration as number} onChange={(v) => setNum('duration', v)} type="number" />

    case 'banner':
      return (
        <>
          <TextInput label="Text" value={step.text as string} onChange={(v) => set('text', v)} />
          <TextInput label="Color" value={step.color as string} onChange={(v) => set('color', v)} />
          <TextInput label="Duration (s)" value={step.duration as number} onChange={(v) => setNum('duration', v)} type="number" />
        </>
      )

    case 'play_sfx':
      return <TextInput label="SFX ID" value={step.text as string} onChange={(v) => set('text', v)} />

    case 'spawn_npc':
      return (
        <>
          <TextInput label="Entity ID" value={step.entity_id as string} onChange={(v) => set('entity_id', v)} />
          <TextInput label="X" value={step.x as number} onChange={(v) => setNum('x', v)} type="number" />
          <TextInput label="Y" value={step.y as number} onChange={(v) => setNum('y', v)} type="number" />
        </>
      )

    case 'spawn':
      return (
        <>
          <TextInput label="Mob Def ID" value={step.mob_def_id as string} onChange={(v) => set('mob_def_id', v)} />
          <TextInput label="X" value={step.x as number} onChange={(v) => setNum('x', v)} type="number" />
          <TextInput label="Y" value={step.y as number} onChange={(v) => setNum('y', v)} type="number" />
        </>
      )

    case 'camera_lock':
      return (
        <>
          <TextInput label="Entity Type" value={step.entity_type as string} onChange={(v) => set('entity_type', v)} />
          <TextInput label="Entity ID" value={step.entity_id as string} onChange={(v) => set('entity_id', v)} />
          <TextInput label="Speed" value={step.speed as number} onChange={(v) => setNum('speed', v)} type="number" />
        </>
      )

    case 'camera_pan':
      return (
        <>
          <TextInput label="X" value={step.x as number} onChange={(v) => setNum('x', v)} type="number" />
          <TextInput label="Y" value={step.y as number} onChange={(v) => setNum('y', v)} type="number" />
          <TextInput label="Speed" value={step.speed as number} onChange={(v) => setNum('speed', v)} type="number" />
        </>
      )

    case 'camera_release':
      return null

    case 'move':
      return (
        <>
          <TextInput label="Entity Type" value={step.entity_type as string} onChange={(v) => set('entity_type', v)} />
          <TextInput label="Entity ID" value={step.entity_id as string} onChange={(v) => set('entity_id', v)} />
          <TextInput label="X" value={step.x as number} onChange={(v) => setNum('x', v)} type="number" />
          <TextInput label="Y" value={step.y as number} onChange={(v) => setNum('y', v)} type="number" />
          <TextInput label="Speed" value={step.speed as number} onChange={(v) => setNum('speed', v)} type="number" />
        </>
      )

    case 'dialogue':
      return (
        <>
          <TextInput label="Dialogue Tree" value={step.dialogue_tree as string} onChange={(v) => set('dialogue_tree', v)} />
          <TextInput label="NPC ID" value={step.npc_id as string} onChange={(v) => set('npc_id', v)} />
        </>
      )

    case 'sprite_state':
      return (
        <>
          <TextInput label="Entity Type" value={step.entity_type as string} onChange={(v) => set('entity_type', v)} />
          <TextInput label="Entity ID" value={step.entity_id as string} onChange={(v) => set('entity_id', v)} />
          <TextInput label="State" value={step.state as string} onChange={(v) => set('state', v)} />
        </>
      )

    case 'zone_transition':
      return (
        <>
          <TextInput label="Zone ID" value={step.zone_id as string} onChange={(v) => set('zone_id', v)} />
          <TextInput label="Target X" value={step.target_x as number} onChange={(v) => setNum('target_x', v)} type="number" />
          <TextInput label="Target Y" value={step.target_y as number} onChange={(v) => setNum('target_y', v)} type="number" />
        </>
      )

    case 'set_light':
    case 'remove_light':
      return (
        <>
          <TextInput label="Entity Type" value={step.entity_type as string} onChange={(v) => set('entity_type', v)} />
          <TextInput label="Entity ID" value={step.entity_id as string} onChange={(v) => set('entity_id', v)} />
          <TextInput label="Radius" value={step.radius as number} onChange={(v) => setNum('radius', v)} type="number" />
        </>
      )

    case 'set_flag':
      return (
        <>
          <TextInput label="Flag" value={step.flag as string} onChange={(v) => set('flag', v)} />
          <TextInput label="Value" value={step.value as string} onChange={(v) => set('value', v)} />
        </>
      )

    case 'despawn':
      return (
        <>
          <TextInput label="Entity Type" value={step.entity_type as string} onChange={(v) => set('entity_type', v)} />
          <TextInput label="Entity ID" value={step.entity_id as string} onChange={(v) => set('entity_id', v)} />
        </>
      )

    case 'heal':
      return (
        <>
          <TextInput label="Entity Type" value={step.entity_type as string} onChange={(v) => set('entity_type', v)} />
          <TextInput label="Entity ID" value={step.entity_id as string} onChange={(v) => set('entity_id', v)} />
          <TextInput label="Amount" value={step.amount as number} onChange={(v) => setNum('amount', v)} type="number" />
        </>
      )

    default:
      return (
        <div className="text-[10px] font-mono p-2 rounded" style={{ background: 'var(--bg-dark)', color: 'var(--text-dim)' }}>
          Unknown action type. Raw fields:<br />
          {Object.entries(step).filter(([k]) => k !== 'action' && k !== 'parallel').map(([k, v]) => (
            <div key={k}>{k}: {JSON.stringify(v)}</div>
          ))}
        </div>
      )
  }
}

function TriggerFields({
  trigger,
  onChange,
}: {
  trigger: CutsceneTrigger
  onChange: (t: CutsceneTrigger) => void
}) {
  const set = (patch: Partial<CutsceneTrigger>) => onChange({ ...trigger, ...patch })

  return (
    <>
      <Field label="Type">
        <select
          className="w-full px-2 py-1 text-xs font-mono rounded"
          style={{ background: 'var(--bg-dark)', color: 'var(--text)', border: '1px solid var(--border)' }}
          value={trigger.type}
          onChange={(e) => set({ type: e.target.value })}
        >
          {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      {(trigger.type === 'zone_entry' || trigger.type === 'trigger_zone') && (
        <TextInput label="Zone ID" value={trigger.zone_id} onChange={(v) => set({ zone_id: v || undefined })} />
      )}
      {trigger.type === 'npc_interact' && (
        <TextInput label="NPC ID" value={trigger.npc_id} onChange={(v) => set({ npc_id: v || undefined })} />
      )}
      {trigger.type === 'quest_stage' && (
        <TextInput label="Quest Stage" value={trigger.quest_stage} onChange={(v) => set({ quest_stage: v ? Number(v) : undefined })} type="number" />
      )}
      {(trigger.type === 'battle_start' || trigger.type === 'battle_end_death' || trigger.type === 'battle_end_plot_armor') && (
        <>
          <TextInput label="Mob ID" value={trigger.mob_id} onChange={(v) => set({ mob_id: v || undefined })} />
          {trigger.type !== 'battle_start' && (
            <TextInput label="HP Threshold %" value={trigger.hp_threshold_pct} onChange={(v) => set({ hp_threshold_pct: v ? Number(v) : undefined })} type="number" />
          )}
        </>
      )}
      <TextInput label="Flag (required)" value={trigger.flag} onChange={(v) => set({ flag: v || undefined })} />
      <TextInput label="Flag Absent (required)" value={trigger.flag_absent} onChange={(v) => set({ flag_absent: v || undefined })} />
    </>
  )
}
