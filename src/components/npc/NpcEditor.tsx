import { useStore } from '../../store'
import { NpcList } from './NpcList'
import { NpcSpriteEditor } from './NpcSpriteEditor'
import { NpcPortraitEditor } from './NpcPortraitEditor'
import { NpcCellProperties } from './NpcCellProperties'

export function NpcEditor() {
  const npcs = useStore((s) => s.npcs)
  const selectedNpcId = useStore((s) => s.selectedNpcId)

  const npc = npcs.find((n) => n.id === selectedNpcId) ?? null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-1 min-h-0">
        <NpcList />
        <div className="flex-1 overflow-auto p-4">
          {npc ? (
            <>
              {/* NPC header */}
              <div className="flex items-baseline gap-3 mb-4">
                <div className="font-mono text-sm font-semibold" style={{ color: 'var(--text-bright)' }}>
                  {npc.name || npc.id}
                </div>
                {npc.title && (
                  <div className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                    {npc.title}
                  </div>
                )}
                <div className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                  id: {npc.id}
                </div>
              </div>

              <NpcSpriteEditor npc={npc} />
              <NpcPortraitEditor npc={npc} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm font-mono" style={{ color: 'var(--text-dim)' }}>
                {npcs.length === 0
                  ? 'Open an NPC file from the File menu'
                  : 'Select an NPC from the list'}
              </div>
            </div>
          )}
        </div>
      </div>

      {npc && <NpcCellProperties npc={npc} />}
    </div>
  )
}
