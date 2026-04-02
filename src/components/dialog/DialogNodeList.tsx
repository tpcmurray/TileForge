import { useStore } from '../../store'
import type { DialogNode } from '../../types/dialog'

export function DialogNodeList() {
  const trees = useStore((s) => s.dialogTrees)
  const selectedTreeId = useStore((s) => s.selectedTreeId)
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const selectNode = useStore((s) => s.selectDialogNode)
  const addNode = useStore((s) => s.addDialogNode)
  const deleteNode = useStore((s) => s.deleteDialogNode)

  const tree = trees.find((t) => t.tree_id === selectedTreeId)

  if (!tree) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm font-mono" style={{ color: 'var(--text-dim)' }}>
          Select a dialog tree
        </div>
      </div>
    )
  }

  const nodeIds = Object.keys(tree.nodes)

  const handleAddNode = () => {
    const id = prompt('New node ID:')
    if (!id || id.trim() === '') return
    if (tree.nodes[id.trim()]) {
      alert('A node with that ID already exists in this tree.')
      return
    }
    const node: DialogNode = { text: '' }
    addNode(tree.tree_id, id.trim(), node)
  }

  const handleDeleteNode = () => {
    if (!selectedNodeId) return
    if (selectedNodeId === tree.root) {
      alert('Cannot delete the root node.')
      return
    }
    if (!confirm(`Delete node "${selectedNodeId}"?`)) return
    deleteNode(tree.tree_id, selectedNodeId)
  }

  const summarize = (node: DialogNode): string => {
    if (node.action) return `[${node.action}]`
    if (node.text) {
      const clean = node.text.replace(/\n/g, ' ')
      return clean.length > 60 ? clean.slice(0, 57) + '...' : clean
    }
    return '(empty)'
  }

  const badge = (node: DialogNode, nodeId: string): string => {
    const parts: string[] = []
    if (nodeId === tree.root) parts.push('ROOT')
    if (node.choices && node.choices.length > 0) parts.push(`${node.choices.length} choice${node.choices.length > 1 ? 's' : ''}`)
    if (node.action) parts.push(node.action)
    if (node.conditions && node.conditions.length > 0) parts.push('conditional')
    if (node.effects && node.effects.length > 0) parts.push(`${node.effects.length} effect${node.effects.length > 1 ? 's' : ''}`)
    if (node.fallback) parts.push(`fallback: ${node.fallback}`)
    return parts.join(' · ')
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ borderRight: '1px solid var(--border)' }}>
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}
      >
        <div
          className="text-[10px] font-mono font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-dim)' }}
        >
          Nodes ({nodeIds.length})
        </div>
        <div className="flex gap-1">
          <button
            className="px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer"
            style={{ color: 'var(--accent)', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
            onClick={handleAddNode}
            title="Add node"
          >
            +
          </button>
          {selectedNodeId && selectedNodeId !== tree.root && (
            <button
              className="px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer"
              style={{ color: 'var(--error)', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
              onClick={handleDeleteNode}
              title="Delete node"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {nodeIds.map((nodeId) => {
          const node = tree.nodes[nodeId]
          const selected = nodeId === selectedNodeId
          const isRoot = nodeId === tree.root
          return (
            <button
              key={nodeId}
              className="w-full text-left px-3 py-2 font-mono text-xs rounded cursor-pointer block"
              style={{
                background: selected ? 'var(--accent-glow)' : 'var(--bg-panel)',
                color: selected ? 'var(--accent)' : 'var(--text)',
                border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}
              onClick={() => selectNode(nodeId)}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold">{nodeId}</span>
                {isRoot && (
                  <span
                    className="px-1 py-0 text-[9px] rounded"
                    style={{ background: 'var(--accent)', color: 'var(--bg-dark)' }}
                  >
                    ROOT
                  </span>
                )}
              </div>
              <div className="truncate" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                {summarize(node)}
              </div>
              {badge(node, nodeId) && (
                <div className="mt-0.5 truncate" style={{ color: 'var(--text-dim)', fontSize: 9 }}>
                  {badge(node, nodeId)}
                </div>
              )}
              {/* Show choice targets as arrows */}
              {node.choices && node.choices.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {node.choices.map((c, i) => (
                    <span
                      key={i}
                      className="px-1 py-0 text-[9px] rounded"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-dim)' }}
                    >
                      → {c.next}
                    </span>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
