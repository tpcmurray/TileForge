import { useStore } from '../../store'
import type { DialogNode, DialogChoice, DialogEffect, DialogCondition } from '../../types/dialog'

export function DialogNodeEditor() {
  const trees = useStore((s) => s.dialogTrees)
  const selectedTreeId = useStore((s) => s.selectedTreeId)
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const updateNode = useStore((s) => s.updateDialogNode)

  const tree = trees.find((t) => t.tree_id === selectedTreeId)
  const node = tree && selectedNodeId ? tree.nodes[selectedNodeId] : null

  if (!tree || !selectedNodeId || !node) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ width: 320, minWidth: 320, background: 'var(--bg-panel)' }}
      >
        <div className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
          Select a node to edit
        </div>
      </div>
    )
  }

  const nodeIds = Object.keys(tree.nodes)

  const update = (patch: Partial<DialogNode>) => {
    updateNode(tree.tree_id, selectedNodeId, { ...node, ...patch })
  }

  const updateChoice = (idx: number, patch: Partial<DialogChoice>) => {
    const choices = [...(node.choices ?? [])]
    choices[idx] = { ...choices[idx], ...patch }
    update({ choices })
  }

  const addChoice = () => {
    const choices = [...(node.choices ?? []), { text: '', next: '' }]
    update({ choices })
  }

  const removeChoice = (idx: number) => {
    const choices = (node.choices ?? []).filter((_, i) => i !== idx)
    update({ choices: choices.length > 0 ? choices : undefined })
  }

  const addEffect = () => {
    const effects = [...(node.effects ?? []), { type: 'reputation' }]
    update({ effects })
  }

  const updateEffect = (idx: number, patch: Partial<DialogEffect>) => {
    const effects = [...(node.effects ?? [])]
    effects[idx] = { ...effects[idx], ...patch }
    update({ effects })
  }

  const removeEffect = (idx: number) => {
    const effects = (node.effects ?? []).filter((_, i) => i !== idx)
    update({ effects: effects.length > 0 ? effects : undefined })
  }

  const addCondition = () => {
    const conditions = [...(node.conditions ?? []), { type: 'flag' }]
    update({ conditions })
  }

  const updateCondition = (idx: number, patch: Partial<DialogCondition>) => {
    const conditions = [...(node.conditions ?? [])]
    conditions[idx] = { ...conditions[idx], ...patch }
    update({ conditions })
  }

  const removeCondition = (idx: number) => {
    const conditions = (node.conditions ?? []).filter((_, i) => i !== idx)
    update({ conditions: conditions.length > 0 ? conditions : undefined })
  }

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ width: 320, minWidth: 320, background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 font-mono text-xs font-semibold"
        style={{ borderBottom: '1px solid var(--border)', color: 'var(--accent)' }}
      >
        {selectedNodeId}
        {selectedNodeId === tree.root && (
          <span className="ml-2 px-1 py-0 text-[9px] rounded" style={{ background: 'var(--accent)', color: 'var(--bg-dark)' }}>
            ROOT
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Text */}
        <Field label="Text">
          <textarea
            className="w-full px-2 py-1 text-xs font-mono rounded resize-y"
            style={{
              background: 'var(--bg-dark)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              minHeight: 300,
            }}
            value={node.text ?? ''}
            onChange={(e) => update({ text: e.target.value || undefined })}
          />
        </Field>

        {/* Action */}
        <Field label="Action">
          <select
            className="w-full px-2 py-1 text-xs font-mono rounded"
            style={{ background: 'var(--bg-dark)', color: 'var(--text)', border: '1px solid var(--border)' }}
            value={node.action ?? ''}
            onChange={(e) => update({ action: e.target.value || undefined })}
          >
            <option value="">(none)</option>
            <option value="close_dialogue">close_dialogue</option>
            <option value="open_merchant_ui">open_merchant_ui</option>
          </select>
        </Field>

        {/* Fallback */}
        <Field label="Fallback Node">
          <select
            className="w-full px-2 py-1 text-xs font-mono rounded"
            style={{ background: 'var(--bg-dark)', color: 'var(--text)', border: '1px solid var(--border)' }}
            value={node.fallback ?? ''}
            onChange={(e) => update({ fallback: e.target.value || undefined })}
          >
            <option value="">(none)</option>
            {nodeIds.filter((id) => id !== selectedNodeId).map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </Field>

        {/* Conditions */}
        <Section
          label="Conditions"
          count={node.conditions?.length ?? 0}
          onAdd={addCondition}
        >
          {(node.conditions ?? []).map((cond, i) => (
            <ConditionRow key={i} condition={cond} onChange={(p) => updateCondition(i, p)} onRemove={() => removeCondition(i)} />
          ))}
        </Section>

        {/* Choices */}
        <Section
          label="Choices"
          count={node.choices?.length ?? 0}
          onAdd={addChoice}
        >
          {(node.choices ?? []).map((choice, i) => (
            <ChoiceRow
              key={i}
              choice={choice}
              nodeIds={nodeIds}
              onChange={(p) => updateChoice(i, p)}
              onRemove={() => removeChoice(i)}
            />
          ))}
        </Section>

        {/* Effects */}
        <Section
          label="Effects"
          count={node.effects?.length ?? 0}
          onAdd={addEffect}
        >
          {(node.effects ?? []).map((eff, i) => (
            <EffectRow key={i} effect={eff} onChange={(p) => updateEffect(i, p)} onRemove={() => removeEffect(i)} />
          ))}
        </Section>
      </div>
    </div>
  )
}

// ── Helpers ──

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

function Section({
  label,
  count,
  onAdd,
  children,
}: {
  label: string
  count: number
  onAdd: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-mono font-semibold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
          {label} ({count})
        </div>
        <button
          className="px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer"
          style={{ color: 'var(--accent)', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
          onClick={onAdd}
        >
          +
        </button>
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

function ChoiceRow({
  choice,
  nodeIds,
  onChange,
  onRemove,
}: {
  choice: DialogChoice
  nodeIds: string[]
  onChange: (p: Partial<DialogChoice>) => void
  onRemove: () => void
}) {
  return (
    <div
      className="p-2 rounded flex flex-col gap-1"
      style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-1">
        <input
          className="flex-1 px-1.5 py-0.5 text-xs font-mono rounded"
          style={{ background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)' }}
          placeholder="Choice text"
          value={choice.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
        <button
          className="px-1 py-0.5 text-[10px] font-mono rounded cursor-pointer"
          style={{ color: 'var(--error)', border: '1px solid var(--border)' }}
          onClick={onRemove}
        >
          ×
        </button>
      </div>
      <div className="flex gap-1 items-center">
        <span className="text-[9px] font-mono" style={{ color: 'var(--text-dim)' }}>→</span>
        <select
          className="flex-1 px-1.5 py-0.5 text-xs font-mono rounded"
          style={{ background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)' }}
          value={choice.next}
          onChange={(e) => onChange({ next: e.target.value })}
        >
          <option value="">(select target)</option>
          {nodeIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
        <input
          className="w-12 px-1 py-0.5 text-[10px] font-mono rounded text-center"
          style={{ background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)' }}
          title="Reputation change"
          placeholder="rep"
          type="number"
          value={choice.reputation_change ?? ''}
          onChange={(e) => onChange({ reputation_change: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>
      {/* Choice conditions */}
      {choice.conditions && choice.conditions.length > 0 && (
        <div className="mt-0.5 flex flex-wrap gap-1">
          {choice.conditions.map((c, i) => (
            <span
              key={i}
              className="px-1 py-0 text-[8px] font-mono rounded"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-dim)' }}
            >
              {c.type} {c.op ?? ''} {c.key ?? ''} {c.value ?? ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function EffectRow({
  effect,
  onChange,
  onRemove,
}: {
  effect: DialogEffect
  onChange: (p: Partial<DialogEffect>) => void
  onRemove: () => void
}) {
  return (
    <div
      className="p-2 rounded flex items-center gap-1"
      style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
    >
      <select
        className="px-1 py-0.5 text-[10px] font-mono rounded"
        style={{ background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)' }}
        value={effect.type}
        onChange={(e) => onChange({ type: e.target.value })}
      >
        <option value="reputation">reputation</option>
        <option value="quest">quest</option>
        <option value="set_flag">set_flag</option>
      </select>
      <input
        className="flex-1 px-1 py-0.5 text-[10px] font-mono rounded"
        style={{ background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)' }}
        placeholder={effect.type === 'reputation' ? 'npc' : 'key'}
        value={effect.npc ?? effect.key ?? ''}
        onChange={(e) => {
          if (effect.type === 'reputation') onChange({ npc: e.target.value })
          else onChange({ key: e.target.value })
        }}
      />
      <input
        className="w-12 px-1 py-0.5 text-[10px] font-mono rounded text-center"
        style={{ background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)' }}
        placeholder="val"
        value={effect.value != null ? String(effect.value) : ''}
        onChange={(e) => onChange({ value: e.target.value ? (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) : undefined })}
      />
      <button
        className="px-1 py-0.5 text-[10px] font-mono rounded cursor-pointer"
        style={{ color: 'var(--error)', border: '1px solid var(--border)' }}
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  )
}

function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: DialogCondition
  onChange: (p: Partial<DialogCondition>) => void
  onRemove: () => void
}) {
  return (
    <div
      className="p-2 rounded flex items-center gap-1 flex-wrap"
      style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
    >
      <select
        className="px-1 py-0.5 text-[10px] font-mono rounded"
        style={{ background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)' }}
        value={condition.type}
        onChange={(e) => onChange({ type: e.target.value })}
      >
        <option value="flag">flag</option>
        <option value="quest_stage">quest_stage</option>
        <option value="quest_status">quest_status</option>
        <option value="reputation">reputation</option>
        <option value="has_item">has_item</option>
        <option value="level">level</option>
      </select>
      <input
        className="w-16 px-1 py-0.5 text-[10px] font-mono rounded"
        style={{ background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)' }}
        placeholder="key"
        value={condition.key ?? ''}
        onChange={(e) => onChange({ key: e.target.value || undefined })}
      />
      <select
        className="px-1 py-0.5 text-[10px] font-mono rounded"
        style={{ background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)' }}
        value={condition.op ?? ''}
        onChange={(e) => onChange({ op: e.target.value || undefined })}
      >
        <option value="">(op)</option>
        <option value="set">set</option>
        <option value="not_set">not_set</option>
        <option value="eq">eq</option>
        <option value="neq">neq</option>
        <option value="gt">gt</option>
        <option value="lt">lt</option>
        <option value="gte">gte</option>
        <option value="lte">lte</option>
      </select>
      <input
        className="w-10 px-1 py-0.5 text-[10px] font-mono rounded"
        style={{ background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)' }}
        placeholder="val"
        value={condition.value ?? ''}
        onChange={(e) => onChange({ value: e.target.value || undefined })}
      />
      <button
        className="px-1 py-0.5 text-[10px] font-mono rounded cursor-pointer"
        style={{ color: 'var(--error)', border: '1px solid var(--border)' }}
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  )
}
