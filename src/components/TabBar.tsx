import { useStore } from '../store'

export function TabBar() {
  const editorMode = useStore((s) => s.editorMode)
  const activeMapTabId = useStore((s) => s.activeMapTabId)
  const activeMapTabLabel = useStore((s) => s.activeMapTabLabel)
  const mapDirty = useStore((s) => s.mapDirty)
  const entitiesDirty = useStore((s) => s.entitiesDirty)
  const mapTabs = useStore((s) => s.mapTabs)
  const switchMapTab = useStore((s) => s.switchMapTab)
  const closeMapTab = useStore((s) => s.closeMapTab)
  const newMapTab = useStore((s) => s.newMapTab)

  // Only show in map mode when at least one tab exists
  if (editorMode !== 'map' || !activeMapTabId) return null

  // Build tab list: background tabs + active tab, in order
  // We want the active tab in the position it was originally
  // Background tabs are stored in order they were pushed; active is current
  const allTabs: { id: string; label: string; dirty: boolean; active: boolean }[] = []

  // Reconstruct: background tabs come first (in their stored order), active tab at its position
  // For simplicity, show background tabs in stored order, then active at end
  // Actually, let's insert the active tab based on when it was created (no easy way to track position)
  // Simplest UX: show tabs in the order they appear in mapTabs, with active inserted at end
  // This means newly opened tabs go to the right — a standard pattern

  for (const tab of mapTabs) {
    allTabs.push({
      id: tab.id,
      label: tab.label,
      dirty: tab.mapDirty || tab.entitiesDirty,
      active: false,
    })
  }
  allTabs.push({
    id: activeMapTabId,
    label: activeMapTabLabel || 'Untitled',
    dirty: mapDirty || entitiesDirty,
    active: true,
  })

  const handleClose = (e: React.MouseEvent, tabId: string, dirty: boolean) => {
    e.stopPropagation()
    if (dirty && !confirm('This tab has unsaved changes. Close anyway?')) return
    closeMapTab(tabId)
  }

  const handleMiddleClick = (e: React.MouseEvent, tabId: string, dirty: boolean) => {
    if (e.button === 1) {
      e.preventDefault()
      if (dirty && !confirm('This tab has unsaved changes. Close anyway?')) return
      closeMapTab(tabId)
    }
  }

  return (
    <div
      className="flex items-end gap-0 font-mono text-[11px] overflow-x-auto"
      style={{
        height: 28,
        minHeight: 28,
        background: 'var(--bg-dark)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {allTabs.map((tab) => (
        <button
          key={tab.id}
          className="flex items-center gap-1.5 px-3 h-full cursor-pointer shrink-0 border-none outline-none"
          style={{
            background: tab.active ? 'var(--bg-panel)' : 'transparent',
            color: tab.active ? 'var(--text-bright)' : 'var(--text-dim)',
            borderBottom: tab.active ? '2px solid var(--accent)' : '2px solid transparent',
            borderRight: '1px solid var(--border)',
          }}
          onClick={() => !tab.active && switchMapTab(tab.id)}
          onMouseDown={(e) => handleMiddleClick(e, tab.id, tab.dirty)}
        >
          <span className="truncate max-w-[160px]">{tab.label}</span>
          {tab.dirty && (
            <span style={{ color: 'var(--orange)', fontSize: 8 }}>●</span>
          )}
          <span
            className="text-[10px] px-0.5 rounded hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-dim)' }}
            onClick={(e) => handleClose(e, tab.id, tab.dirty)}
          >
            ×
          </span>
        </button>
      ))}
      <button
        className="px-2 h-full cursor-pointer shrink-0 border-none outline-none"
        style={{ background: 'transparent', color: 'var(--text-dim)' }}
        onClick={() => {
          const w = prompt('Map width (cells):', '30')
          const h = prompt('Map height (cells):', '20')
          if (w && h) {
            const width = parseInt(w), height = parseInt(h)
            if (width > 0 && height > 0) newMapTab(width, height, '..')
          }
        }}
        title="New map tab"
      >
        +
      </button>
    </div>
  )
}
