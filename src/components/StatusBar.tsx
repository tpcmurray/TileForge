export function StatusBar() {
  return (
    <div
      className="flex items-center px-3.5 gap-6 font-mono text-[11px]"
      style={{
        height: 'var(--statusbar-height)',
        background: 'var(--bg-dark)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--text-dim)' }}>
        Cursor: <strong style={{ color: 'var(--text)', fontWeight: 500 }}>—</strong>
      </span>
      <Separator />
      <span style={{ color: 'var(--text-dim)' }}>
        Tile: <strong style={{ color: 'var(--text)', fontWeight: 500 }}>—</strong>
      </span>
      <Separator />
      <span style={{ color: 'var(--text-dim)' }}>
        Map: <strong style={{ color: 'var(--text)', fontWeight: 500 }}>No map</strong>
      </span>
      <div className="flex-1" />
      <span style={{ color: 'var(--text-dim)' }}>Ready</span>
    </div>
  )
}

function Separator() {
  return (
    <div
      className="h-4"
      style={{ width: 1, background: 'var(--border)' }}
    />
  )
}
