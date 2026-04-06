import { useState } from 'react'
import { useStore } from '../store'
import { ColorPicker } from './ColorPicker'
import type { RGBA } from '../types'
import type {
  Entity,
  EntityType,
  DoorEntity,
  SpawnEntity,
  NpcEntity,
  ChestEntity,
  SignEntity,
  TriggerEntity,
  LabelEntity,
} from '../types'

interface Props {
  entity: Entity | null
  defaultPos?: { x: number; y: number }
  onClose: () => void
}

const ENTITY_TYPES: EntityType[] = ['SPAWN', 'NPC', 'CHEST', 'SIGN', 'DOOR', 'TRIGGER', 'LABEL']

function makeDefault(type: EntityType, x: number, y: number): Entity {
  const base = { id: crypto.randomUUID(), x, y }
  switch (type) {
    case 'DOOR':
      return { ...base, type: 'DOOR', w: 1, h: 1, targetZone: '', targetX: 0, targetY: 0 }
    case 'SPAWN':
      return { ...base, type: 'SPAWN', mobDefId: '', patrol: null, respawn: null }
    case 'NPC':
      return { ...base, type: 'NPC', npcDefId: '' }
    case 'CHEST':
      return { ...base, type: 'CHEST', lootTable: '', itemLevel: 1 }
    case 'SIGN':
      return { ...base, type: 'SIGN', message: '' }
    case 'TRIGGER':
      return { ...base, type: 'TRIGGER', w: 1, h: 1, cutsceneId: '', flag: null, absent: null }
    case 'LABEL':
      return { ...base, type: 'LABEL', fg: 'White', bg: 'Transparent', text: '' }
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
        {data.type === 'LABEL' && <LabelFields data={data} update={update} />}

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
        <Label>Respawn (seconds — leave blank for none)</Label>
        <TextInput
          value={data.respawn != null ? String(data.respawn) : ''}
          onChange={(v) => {
            if (!v.trim()) { update({ respawn: null }); return }
            const n = parseInt(v, 10)
            if (!isNaN(n)) update({ respawn: n })
          }}
        />
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

/** Parse a color string (named or hex) into RGBA */
function colorStringToRGBA(s: string): RGBA {
  const lower = s.toLowerCase()
  if (lower === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }

  const NAMED: Record<string, RGBA> = {
    white: { r: 255, g: 255, b: 255, a: 255 },
    black: { r: 0, g: 0, b: 0, a: 255 },
    red: { r: 255, g: 0, b: 0, a: 255 },
    green: { r: 0, g: 128, b: 0, a: 255 },
    blue: { r: 0, g: 0, b: 255, a: 255 },
    yellow: { r: 255, g: 255, b: 0, a: 255 },
    cyan: { r: 0, g: 255, b: 255, a: 255 },
    magenta: { r: 255, g: 0, b: 255, a: 255 },
    orange: { r: 255, g: 165, b: 0, a: 255 },
    purple: { r: 128, g: 0, b: 128, a: 255 },
    gold: { r: 255, g: 215, b: 0, a: 255 },
    silver: { r: 192, g: 192, b: 192, a: 255 },
    gray: { r: 128, g: 128, b: 128, a: 255 },
    grey: { r: 128, g: 128, b: 128, a: 255 },
  }
  if (NAMED[lower]) return NAMED[lower]

  // Parse hex
  const hex = s.replace(/^#/, '')
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 255,
    }
  }
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 255,
    }
  }
  return { r: 255, g: 255, b: 255, a: 255 }
}

/** Convert RGBA back to a color string for entity storage */
function rgbaToColorString(c: RGBA): string {
  if (c.a === 0) return 'Transparent'
  return `#${c.r.toString(16).padStart(2, '0')}${c.g.toString(16).padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`
}

/** CSS-renderable color from entity color string */
function colorStringToCSS(s: string): string {
  const lower = s.toLowerCase()
  if (lower === 'transparent') return 'transparent'
  // Named colors and hex values are valid CSS
  return s
}

function LabelFields({ data, update }: { data: LabelEntity; update: (p: Partial<LabelEntity>) => void }) {
  const [pickTarget, setPickTarget] = useState<'fg' | 'bg' | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <Label>Foreground</Label>
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 rounded shrink-0 cursor-pointer"
              style={{
                background: colorStringToCSS(data.fg),
                border: '2px solid var(--border-light)',
              }}
              onClick={() => setPickTarget('fg')}
            />
            <span className="font-mono text-[10px] truncate" style={{ color: 'var(--text-dim)' }}>
              {data.fg}
            </span>
          </div>
        </div>
        <div>
          <Label>Background</Label>
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 rounded shrink-0 cursor-pointer"
              style={{
                background: data.bg.toLowerCase() === 'transparent'
                  ? 'repeating-conic-gradient(#444 0% 25%, #666 0% 50%) 50% / 12px 12px'
                  : colorStringToCSS(data.bg),
                border: '2px solid var(--border-light)',
              }}
              onClick={() => setPickTarget('bg')}
            />
            <span className="font-mono text-[10px] truncate" style={{ color: 'var(--text-dim)' }}>
              {data.bg}
            </span>
          </div>
        </div>
      </div>
      <div className="mb-3">
        <Label>Text</Label>
        <TextInput value={data.text} onChange={(v) => update({ text: v })} />
      </div>
      {/* Label text preview */}
      <div className="mb-3 rounded px-2 py-1.5 font-mono text-sm" style={{
        background: data.bg.toLowerCase() === 'transparent'
          ? 'repeating-conic-gradient(#444 0% 25%, #666 0% 50%) 50% / 12px 12px'
          : colorStringToCSS(data.bg),
        color: colorStringToCSS(data.fg),
        border: '1px solid var(--border)',
      }}>
        {data.text || '(empty)'}
      </div>
      {pickTarget === 'fg' && (
        <ColorPicker
          color={colorStringToRGBA(data.fg)}
          onChange={(c) => update({ fg: rgbaToColorString(c) })}
          onClose={() => setPickTarget(null)}
        />
      )}
      {pickTarget === 'bg' && (
        <ColorPicker
          color={colorStringToRGBA(data.bg)}
          onChange={(c) => update({ bg: rgbaToColorString(c) })}
          onClose={() => setPickTarget(null)}
          showTransparent
        />
      )}
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
