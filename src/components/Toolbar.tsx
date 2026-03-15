export function Toolbar() {
  return (
    <div
      className="overflow-y-auto overflow-x-hidden"
      style={{
        width: 'var(--toolbar-width)',
        minWidth: 'var(--toolbar-width)',
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
      }}
    >
      <ToolbarSection title="Tools">
        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Paint / Erase / Pick
        </div>
      </ToolbarSection>
      <ToolbarSection title="Active Tile">
        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
          No tile selected
        </div>
      </ToolbarSection>
      <ToolbarSection title="Colors">
        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
          FG / BG color swatches
        </div>
      </ToolbarSection>
      <ToolbarSection title="Tile Palette">
        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Load a registry to see tiles
        </div>
      </ToolbarSection>
    </div>
  )
}

function ToolbarSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className="p-3"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div
        className="font-mono text-[10px] font-semibold uppercase tracking-[1.5px] mb-2.5"
        style={{ color: 'var(--text-dim)' }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}
