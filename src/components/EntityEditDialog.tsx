import { useState } from 'react'
import { useStore } from '../store'
import type {
  Entity,
  EntityType,
  DoorEntity,
  SpawnEntity,
  NpcEntity,
  ChestEntity,
  SignEntity,
  TriggerEntity,
} from '../types'

interface Props {
  entity: Entity | null
  defaultPos?: { x: number; y: number }
  onClose: () => void
}

const ENTITY_TYPES: EntityType[] = ['SPAWN', 'NPC', 'CHEST', 'SIGN', 'DOOR', 'TRIGGER']

function makeDefault(type: EntityType, x: number, y: number): Entity {
  const base = { id: crypto.randomUUID(), x, y }
  switch (type) {
    case 'DOOR':
      return { ...base, type: 'DOOR', w: 1, h: 1, targetZone: '', targetX: 0, targetY: 0 }
    case 'SPAWN':
      return { ...base, type: 'SPAWN', mobDefId: '', patrol: null }
    case 'NPC':
      return { ...base, type: 'NPC', npcDefId: '' }
    case 'CHEST':
      return { ...base, type: 'CHEST', lootTable: '', itemLevel: 1 }
    case 'SIGN':
      return { ...base, type: 'SIGN', message: '' }
    case 'TRIGGER':
      return { ...base, type: 'TRIGGER', w: 1, h: 1, cutsceneId: '', flag: null, absent: null }
  }
}

export function EntityEditDialog({ entity, defaultPos, onClose }: Props) {
  const isNew = !entity
  const pos = defaultPos ?? { x: 0, y: 0 }
  const [data, setData] = useState<Entity>(
    entity ?? makeDefault('SPAWN', pos.x, pos.y),
  )

  const update = (partial: Partial<Entity>) => {
    setData((d) => ({ ...d, ...partial }) as Entity)
  }

  const changeType = (type: EntityType) => {
    setData(makeDefault(type, data.x, data.y))
  }

  const handleSave = () => {
    if (isNew) {
      useStore.getState().addEntity(data)
    } else {
      useStore.getState().updateEntity(data.id, data)
    }
    onClose()
  }

  const handleDelete = () => {
    if (!isNew) {
      useStore.getState().deleteEntity(data.id)
    }
    onClose()
  }

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
          width: 420,
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="font-mono text-sm font-semibold" style={{ color: 'var(--text-bright)' }}>
            {isNew ? 'New Entity' : `Edit ${data.type}`}
          </div>
          <button
            className="px-1.5 py-0.5 rounded text-lg cursor-pointer"
            style={{ color: 'var(--text-dim)', background: 'none', border: 'none' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Type selector */}
        <div className="mb-3">
          <Label>Type</Label>
          <select
            value={data.type}
            onChange={(e) => changeType(e.target.value as EntityType)}
            disabled={!isNew}
            className="w-full font-mono text-xs rounded px-2 py-1.5 outline-none cursor-pointer"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              opacity: isNew ? 1 : 0.6,
            }}
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label>X</Label>
            <NumInput value={data.x} onChange={(v) => update({ x: v })} step={1} />
          </div>
          <div>
            <Label>Y</Label>
            <NumInput value={data.y} onChange={(v) => update({ y: v })} step={1} />
          </div>
        </div>

        {/* Type-specific fields */}
        {data.type === 'DOOR' && <DoorFields data={data} update={update} />}
        {data.type === 'SPAWN' && <SpawnFields data={data} update={update} />}
        {data.type === 'NPC' && <NpcFields data={data} update={update} />}
        {data.type === 'CHEST' && <ChestFields data={data} update={update} />}
        {data.type === 'SIGN' && <SignFields data={data} update={update} />}
        {data.type === 'TRIGGER' && <TriggerFields data={data} update={update} />}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          {!isNew && (
            <button
              className="text-xs px-3 py-1.5 rounded cursor-pointer"
              style={{
                background: 'rgba(255,80,80,0.15)',
                border: '1px solid rgba(255,80,80,0.4)',
                color: '#ff6666',
              }}
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            className="text-xs px-3 py-1.5 rounded cursor-pointer"
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
              background: 'var(--accent)',
              border: '1px solid var(--accent)',
              color: '#fff',
            }}
            onClick={handleSave}
          >
            {isNew ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Type-specific field groups ──

function DoorFields({ data, update }: { data: DoorEntity; update: (p: Partial<DoorEntity>) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div><Label>Width</Label><NumInput value={data.w} onChange={(v) => update({ w: v })} min={1} step={1} /></div>
        <div><Label>Height</Label><NumInput value={data.h} onChange={(v) => update({ h: v })} min={1} step={1} /></div>
      </div>
      <div className="mb-3">
        <Label>Target Zone</Label>
        <TextInput value={data.targetZone} onChange={(v) => update({ targetZone: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div><Label>Target X</Label><NumInput value={data.targetX} onChange={(v) => update({ targetX: v })} step={1} /></div>
        <div><Label>Target Y</Label><NumInput value={data.targetY} onChange={(v) => update({ targetY: v })} step={1} /></div>
      </div>
    </>
  )
}

function SpawnFields({ data, update }: { data: SpawnEntity; update: (p: Partial<SpawnEntity>) => void }) {
  return (
    <>
      <div className="mb-3">
        <Label>Mob Definition ID</Label>
        <TextInput value={data.mobDefId} onChange={(v) => update({ mobDefId: v })} />
      </div>
      <div className="mb-3">
        <Label>Patrol (x1,y1,x2,y2 — leave blank for none)</Label>
        <TextInput
          value={data.patrol ? `${data.patrol.x1},${data.patrol.y1},${data.patrol.x2},${data.patrol.y2}` : ''}
          onChange={(v) => {
            if (!v.trim()) { update({ patrol: null }); return }
            const parts = v.split(',').map(parseFloat)
            if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
              update({ patrol: { x1: parts[0], y1: parts[1], x2: parts[2], y2: parts[3] } })
            }
          }}
        />
      </div>
    </>
  )
}

function NpcFields({ data, update }: { data: NpcEntity; update: (p: Partial<NpcEntity>) => void }) {
  return (
    <div className="mb-3">
      <Label>NPC Definition ID</Label>
      <TextInput value={data.npcDefId} onChange={(v) => update({ npcDefId: v })} />
    </div>
  )
}

function ChestFields({ data, update }: { data: ChestEntity; update: (p: Partial<ChestEntity>) => void }) {
  return (
    <>
      <div className="mb-3">
        <Label>Loot Table</Label>
        <TextInput value={data.lootTable} onChange={(v) => update({ lootTable: v })} />
      </div>
      <div className="mb-3">
        <Label>Item Level</Label>
        <NumInput value={data.itemLevel} onChange={(v) => update({ itemLevel: v })} min={1} step={1} />
      </div>
    </>
  )
}

function SignFields({ data, update }: { data: SignEntity; update: (p: Partial<SignEntity>) => void }) {
  return (
    <div className="mb-3">
      <Label>Message</Label>
      <textarea
        value={data.message}
        onChange={(e) => update({ message: e.target.value })}
        rows={3}
        className="w-full font-mono text-xs rounded px-2 py-1.5 outline-none resize-y"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
      />
    </div>
  )
}

function TriggerFields({ data, update }: { data: TriggerEntity; update: (p: Partial<TriggerEntity>) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div><Label>Width</Label><NumInput value={data.w} onChange={(v) => update({ w: v })} min={1} step={1} /></div>
        <div><Label>Height</Label><NumInput value={data.h} onChange={(v) => update({ h: v })} min={1} step={1} /></div>
      </div>
      <div className="mb-3">
        <Label>Cutscene ID</Label>
        <TextInput value={data.cutsceneId} onChange={(v) => update({ cutsceneId: v })} />
      </div>
      <div className="mb-3">
        <Label>Flag (required — leave blank for none)</Label>
        <TextInput value={data.flag ?? ''} onChange={(v) => update({ flag: v || null })} />
      </div>
      <div className="mb-3">
        <Label>Absent Flag (must NOT be set — leave blank for none)</Label>
        <TextInput value={data.absent ?? ''} onChange={(v) => update({ absent: v || null })} />
      </div>
    </>
  )
}

// ── Reusable input components ──

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-mono uppercase mb-1 block" style={{ color: 'var(--text-dim)' }}>
      {children}
    </label>
  )
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full font-mono text-xs rounded px-2 py-1.5 outline-none"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
      }}
      spellCheck={false}
    />
  )
}

function NumInput({
  value,
  onChange,
  min,
  step = 1,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => {
        let v = step === 1 ? parseInt(e.target.value) : parseFloat(e.target.value)
        if (isNaN(v)) v = 0
        if (min !== undefined && v < min) v = min
        onChange(v)
      }}
      step={step}
      min={min}
      className="w-full font-mono text-xs rounded px-2 py-1.5 outline-none"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
      }}
    />
  )
}
