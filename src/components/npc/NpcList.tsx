import { useStore } from '../../store'

export function NpcList() {
  const npcs = useStore((s) => s.npcs)
  const selectedNpcId = useStore((s) => s.selectedNpcId)
  const selectNpc = useStore((s) => s.selectNpc)

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: 200,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-panel)',
      }}
    >
      <div
        className="text-[10px] font-mono font-semibold uppercase tracking-wide px-3 py-2"
        style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}
      >
        NPCs ({npcs.length})
      </div>
      <div className="flex-1 overflow-y-auto">
        {npcs.map((npc) => {
          const selected = npc.id === selectedNpcId
          return (
            <button
              key={npc.id}
              className="w-full text-left px-3 py-1.5 font-mono text-xs cursor-pointer block"
              style={{
                background: selected ? 'var(--accent-glow)' : 'transparent',
                color: selected ? 'var(--accent)' : 'var(--text)',
                border: 'none',
                borderBottom: '1px solid var(--border)',
              }}
              onClick={() => selectNpc(npc.id)}
            >
              <div className="font-semibold truncate">{npc.name || npc.id}</div>
              {npc.title && (
                <div className="truncate" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                  {npc.title}
                </div>
              )}
            </button>
          )
        })}
        {npcs.length === 0 && (
          <div className="px-3 py-4 text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
            No NPCs loaded
          </div>
        )}
      </div>
    </div>
  )
}
