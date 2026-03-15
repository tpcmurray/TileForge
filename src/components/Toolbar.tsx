import { ToolSelector } from './ToolSelector'
import { ActiveTileDisplay } from './ActiveTileDisplay'
import { TilePalette } from './TilePalette'

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
        <ToolSelector />
      </ToolbarSection>
      <ToolbarSection title="Active Tile">
        <ActiveTileDisplay />
      </ToolbarSection>
      <ToolbarSection title="Tile Palette" noBorder>
        <TilePalette />
      </ToolbarSection>
    </div>
  )
}

function ToolbarSection({
  title,
  children,
  noBorder,
}: {
  title: string
  children: React.ReactNode
  noBorder?: boolean
}) {
  return (
    <div
      className="p-3"
      style={{ borderBottom: noBorder ? 'none' : '1px solid var(--border)' }}
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
