import { useStore } from '../../store'
import type { DialogTree } from '../../types/dialog'

export function DialogTreeList() {
  const trees = useStore((s) => s.dialogTrees)
  const selectedTreeId = useStore((s) => s.selectedTreeId)
  const selectTree = useStore((s) => s.selectDialogTree)
  const addTree = useStore((s) => s.addDialogTree)
  const deleteTree = useStore((s) => s.deleteDialogTree)

  const handleAdd = () => {
    const id = prompt('New tree ID:')
    if (!id || id.trim() === '') return
    if (trees.some((t) => t.tree_id === id.trim())) {
      alert('A tree with that ID already exists.')
      return
    }
    const tree: DialogTree = {
      tree_id: id.trim(),
      root: 'greeting',
      nodes: {
        greeting: { text: 'Hello.', choices: [{ text: 'Goodbye.', next: 'exit' }] },
        exit: { action: 'close_dialogue' },
      },
      rawJson: {},
    }
    addTree(tree)
  }

  const handleDelete = () => {
    if (!selectedTreeId) return
    if (!confirm(`Delete tree "${selectedTreeId}"?`)) return
    deleteTree(selectedTreeId)
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: 200,
        minWidth: 200,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-panel)',
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="text-[10px] font-mono font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-dim)' }}
        >
          Trees ({trees.length})
        </div>
        <div className="flex gap-1">
          <button
            className="px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer"
            style={{ color: 'var(--accent)', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
            onClick={handleAdd}
            title="Add tree"
          >
            +
          </button>
          {selectedTreeId && (
            <button
              className="px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer"
              style={{ color: 'var(--error)', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
              onClick={handleDelete}
              title="Delete tree"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {trees.map((tree) => {
          const selected = tree.tree_id === selectedTreeId
          const nodeCount = Object.keys(tree.nodes).length
          return (
            <button
              key={tree.tree_id}
              className="w-full text-left px-3 py-1.5 font-mono text-xs cursor-pointer block"
              style={{
                background: selected ? 'var(--accent-glow)' : 'transparent',
                color: selected ? 'var(--accent)' : 'var(--text)',
                border: 'none',
                borderBottom: '1px solid var(--border)',
              }}
              onClick={() => selectTree(tree.tree_id)}
            >
              <div className="font-semibold truncate">{tree.tree_id}</div>
              <div className="truncate" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                root: {tree.root} · {nodeCount} node{nodeCount !== 1 ? 's' : ''}
              </div>
            </button>
          )
        })}
        {trees.length === 0 && (
          <div className="px-3 py-4 text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
            No dialog trees loaded
          </div>
        )}
      </div>
    </div>
  )
}
