export function MapCanvas() {
  return (
    <div
      className="flex-1 relative overflow-hidden flex items-center justify-center"
      style={{ background: 'var(--bg-darkest)' }}
    >
      <div
        className="text-sm font-mono"
        style={{ color: 'var(--text-dim)' }}
      >
        Map Canvas — No map loaded
      </div>
    </div>
  )
}
