import { useStore } from '../store'

export function StatusBar() {
  const { tiles, mapWidth, mapHeight, cells, zoom, mapDirty, registryDirty } = useStore()
  const cursorX = useStore((s) => (s as Record<string, number>)._cursorX ?? -1)
  const cursorY = useStore((s) => (s as Record<string, number>)._cursorY ?? -1)

  const hasCursor = cursorX >= 0 && cursorY >= 0
  const tileCode = hasCursor ? cells[cursorY]?.[cursorX] : null
  const tileDef = tileCode ? tiles.get(tileCode) : null
  const hasMap = mapWidth > 0 && mapHeight > 0
  const isDirty = mapDirty || registryDirty

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
        Cursor:{' '}
        <strong style={{ color: 'var(--text)', fontWeight: 500 }}>
          {hasCursor ? `${cursorX}, ${cursorY}` : '—'}
        </strong>
      </span>
      <Separator />
      <span style={{ color: 'var(--text-dim)' }}>
        Tile:{' '}
        <strong style={{ color: 'var(--text)', fontWeight: 500 }}>
          {tileDef ? `${tileCode} ${tileDef.name}` : tileCode ?? '—'}
        </strong>
      </span>
      <Separator />
      <span style={{ color: 'var(--text-dim)' }}>
        Map:{' '}
        <strong style={{ color: 'var(--text)', fontWeight: 500 }}>
          {hasMap ? `${mapWidth} × ${mapHeight}` : 'No map'}
        </strong>
      </span>
      <Separator />
      <span style={{ color: 'var(--text-dim)' }}>
        Registry:{' '}
        <strong style={{ color: 'var(--text)', fontWeight: 500 }}>
          {tiles.size} tiles
        </strong>
      </span>
      <div className="flex-1" />
      <span style={{ color: 'var(--text-dim)' }}>
        Zoom: {Math.round(zoom * 100)}%
      </span>
      <Separator />
      <span style={{ color: isDirty ? 'var(--orange)' : 'var(--green)' }}>
        {isDirty ? '● Unsaved' : '● Saved'}
      </span>
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
