import { useStore } from '../../store'
import { SpriteList } from './SpriteList'
import { SpriteStatesEditor } from './SpriteStatesEditor'
import { SpritePortraitEditor } from './SpritePortraitEditor'
import { SpriteCellProperties } from './SpriteCellProperties'

export function SpriteEditor() {
  const sprites = useStore((s) => s.sprites)
  const selectedSpriteId = useStore((s) => s.selectedSpriteId)

  const npc = sprites.find((n) => n.id === selectedSpriteId) ?? null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-1 min-h-0">
        <SpriteList />
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

              <SpriteStatesEditor npc={npc} />
              <SpritePortraitEditor npc={npc} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm font-mono" style={{ color: 'var(--text-dim)' }}>
                {sprites.length === 0
                  ? 'Open an NPC file from the File menu'
                  : 'Select an NPC from the list'}
              </div>
            </div>
          )}
        </div>
      </div>

      {npc && <SpriteCellProperties npc={npc} />}
    </div>
  )
}
