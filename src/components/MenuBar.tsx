export function MenuBar() {
  return (
    <div
      className="flex items-center px-3 gap-0.5"
      style={{
        height: 'var(--menubar-height)',
        background: 'var(--bg-dark)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        className="mr-4 font-mono text-[13px] font-bold tracking-wider"
        style={{ color: 'var(--accent)' }}
      >
        TILEFORGE{' '}
        <span className="font-normal" style={{ color: 'var(--text-dim)' }}>
          v0.1
        </span>
      </div>
      {['File', 'Edit', 'View', 'Help'].map((item) => (
        <div
          key={item}
          className="px-2.5 py-1 text-xs rounded cursor-pointer transition-colors"
          style={{ color: 'var(--text-dim)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)'
            e.currentTarget.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-dim)'
          }}
        >
          {item}
        </div>
      ))}
    </div>
  )
}
