import { useState } from 'react'
import { useStore } from '../store'
import { EntityEditDialog } from './EntityEditDialog'
import type { Entity, EntityType } from '../types'

const TYPE_COLORS: Record<EntityType, string> = {
  DOOR: '#c878ff',
  SPAWN: '#ff5050',
  NPC: '#50c8ff',
  CHEST: '#ffc832',
  SIGN: '#96ff96',
  TRIGGER: '#ffa03c',
  LABEL: '#e0e0e0',
  WEATHER: '#64b5f6',
  ZONE: '#b0bec5',
  MUSIC: '#ce93d8',
  ITEM: '#ffd54f',
  CRITTER: '#8bc34a',
}

const TYPE_LABELS: Record<EntityType, string> = {
  DOOR: 'D',
  SPAWN: 'S',
  NPC: 'N',
  CHEST: 'C',
  SIGN: '!',
  TRIGGER: 'T',
  LABEL: 'L',
  WEATHER: 'W',
  ZONE: 'Z',
  MUSIC: 'M',
  ITEM: 'i',
  CRITTER: 'c',
}

function entitySummary(e: Entity): string {
  switch (e.type) {
    case 'DOOR': return `${e.targetZone} → ${e.targetX},${e.targetY}`
    case 'SPAWN': return e.mobDefId
    case 'NPC': return e.npcDefId
    case 'CHEST': return `${e.lootTable} lv${e.itemLevel}`
    case 'SIGN': return e.message.length > 20 ? e.message.slice(0, 20) + '…' : e.message
    case 'TRIGGER': return e.cutsceneId
    case 'LABEL': return e.text.length > 20 ? e.text.slice(0, 20) + '…' : e.text
    case 'WEATHER': return `${e.weatherType} ${e.intensity}`
    case 'ZONE': return `${e.zoneName}${e.town ? ' (town)' : ''}`
    case 'MUSIC': return `${e.trackId} vol:${e.volume}`
    case 'ITEM': return e.itemId
    case 'CRITTER': return `${e.critterId} ${e.x},${e.y}→${e.x2},${e.y2}`
  }
}

export function EntityPanel() {
  const entities = useStore((s) => s.entities)
  const selectedEntityId = useStore((s) => s.selectedEntityId)
  const entitiesFileHandle = useStore((s) => s.entitiesFileHandle)
  const setSelectedEntity = useStore((s) => s.setSelectedEntity)
  const setPan = useStore((s) => s.setPan)
  const zoom = useStore((s) => s.zoom)

  const [editingEntity, setEditingEntity] = useState<Entity | null | 'new'>(null)

  const handleClick = (e: Entity) => {
    setSelectedEntity(e.id)
    // Pan to center entity on screen
    const cellW = 16 * zoom
    const cellH = 32 * zoom
    const cx = -(e.x * cellW) + window.innerWidth / 2
    const cy = -(e.y * cellH) + window.innerHeight / 2
    setPan(cx, cy)
  }

  // Group by type
  const typeOrder: EntityType[] = ['ZONE', 'MUSIC', 'SPAWN', 'CRITTER', 'NPC', 'CHEST', 'ITEM', 'SIGN', 'DOOR', 'TRIGGER', 'LABEL', 'WEATHER']
  const grouped = typeOrder
    .map((type) => ({
      type,
      items: entities.filter((e) => e.type === type),
    }))
    .filter((g) => g.items.length > 0)

  const entitiesLoaded = entitiesFileHandle !== null
  const entitiesFileName = entitiesFileHandle?.name ?? null

  return (
    <div>
      {/* Entities file status indicator */}
      <div
        className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded text-[10px] font-mono"
        style={{
          background: 'var(--bg-surface)',
          border: `1px solid ${entitiesLoaded ? '#3a7a3a' : '#7a5a3a'}`,
          color: entitiesLoaded ? '#7fdc7f' : '#ffb86c',
        }}
        title={
          entitiesLoaded
            ? `Loaded: ${entitiesFileName}`
            : 'No .entities file loaded — use File ▸ Open Entities… to load one manually'
        }
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: entitiesLoaded ? '#7fdc7f' : '#ffb86c',
            flexShrink: 0,
          }}
        />
        <span className="truncate">
          {entitiesLoaded ? entitiesFileName : 'No .entities file'}
        </span>
      </div>

      <button
        className="w-full text-xs py-1.5 rounded cursor-pointer mb-2"
        style={{
          background: 'var(--accent)',
          border: '1px solid var(--accent)',
          color: '#fff',
        }}
        onClick={() => setEditingEntity('new')}
      >
        + Add Entity
      </button>

      {entities.length === 0 && (
        <div className="text-[10px] font-mono py-2" style={{ color: 'var(--text-dim)' }}>
          No entities. Open a .entities file or add one.
        </div>
      )}

      {grouped.map(({ type, items }) => (
        <div key={type} className="mb-2">
          <div
            className="text-[9px] font-mono font-semibold uppercase tracking-wide mb-1 flex items-center gap-1.5"
            style={{ color: TYPE_COLORS[type] }}
          >
            <span
              className="inline-flex items-center justify-center rounded text-[8px] font-bold"
              style={{
                width: 14,
                height: 14,
                background: TYPE_COLORS[type],
                color: '#000',
              }}
            >
              {TYPE_LABELS[type]}
            </span>
            {type} ({items.length})
          </div>
          {items.map((e) => {
            const selected = e.id === selectedEntityId
            return (
              <div
                key={e.id}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer text-[11px] font-mono"
                style={{
                  background: selected ? 'var(--accent-glow)' : 'transparent',
                  border: `1px solid ${selected ? 'var(--accent)' : 'transparent'}`,
                  color: selected ? 'var(--accent)' : 'var(--text)',
                }}
                onClick={() => handleClick(e)}
                onDoubleClick={() => setEditingEntity(e)}
              >
                {e.type !== 'WEATHER' && e.type !== 'ZONE' && e.type !== 'MUSIC' && (
                  <span style={{ color: 'var(--text-dim)', fontSize: 9 }}>
                    {Math.round(e.x)},{Math.round(e.y)}
                  </span>
                )}
                <span className="truncate flex-1">{entitySummary(e)}</span>
              </div>
            )
          })}
        </div>
      ))}

      {editingEntity && (
        <EntityEditDialog
          entity={editingEntity === 'new' ? null : editingEntity}
          onClose={() => setEditingEntity(null)}
        />
      )}
    </div>
  )
}
