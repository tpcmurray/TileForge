import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useStore } from '../../store'
import type { DialogNode } from '../../types/dialog'
import {
  layoutDialogTree,
  computeEdges,
  edgePath,
  NODE_W,
  NODE_H,
} from '../../utils/dialogLayout'

export function DialogNodeGraph() {
  const trees = useStore((s) => s.dialogTrees)
  const selectedTreeId = useStore((s) => s.selectedTreeId)
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const selectNode = useStore((s) => s.selectDialogNode)
  const addNode = useStore((s) => s.addDialogNode)
  const deleteNode = useStore((s) => s.deleteDialogNode)

  const tree = trees.find((t) => t.tree_id === selectedTreeId)

  // Pan state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panRef = useRef(pan)
  panRef.current = pan

  // Drag overrides for node positions
  const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>({})

  // Interaction refs
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const isDragging = useRef<string | null>(null)
  const pointerStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })
  const dragNodeStart = useRef({ x: 0, y: 0 })
  const didMove = useRef(false)

  // Compute layout
  const autoLayout = useMemo(() => {
    if (!tree) return {}
    return layoutDialogTree(tree)
  }, [tree])

  // Reset pan + drag offsets when tree changes
  useEffect(() => {
    setPan({ x: 0, y: 0 })
    setDragOffsets({})
  }, [selectedTreeId])

  // Merge auto layout with drag overrides
  const positions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    for (const [id, p] of Object.entries(autoLayout)) {
      const off = dragOffsets[id]
      pos[id] = off ? { x: p.x + off.x, y: p.y + off.y } : p
    }
    return pos
  }, [autoLayout, dragOffsets])

  const edges = useMemo(() => {
    if (!tree) return []
    return computeEdges(tree)
  }, [tree])

  // Center the graph in the viewport on first layout
  useEffect(() => {
    if (!containerRef.current || Object.keys(positions).length === 0) return
    const rect = containerRef.current.getBoundingClientRect()
    // Find bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of Object.values(autoLayout)) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x + NODE_W > maxX) maxX = p.x + NODE_W
      if (p.y + NODE_H > maxY) maxY = p.y + NODE_H
    }
    const graphW = maxX - minX
    const graphH = maxY - minY
    setPan({
      x: (rect.width - graphW) / 2 - minX,
      y: 40 - minY,
    })
  }, [autoLayout])

  // Pointer handlers for pan + drag
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only left button
    if (e.button !== 0) return

    const target = e.target as HTMLElement
    const nodeCard = target.closest('[data-node-id]') as HTMLElement | null

    pointerStart.current = { x: e.clientX, y: e.clientY }
    didMove.current = false

    if (nodeCard) {
      // Start dragging a node
      const nodeId = nodeCard.dataset.nodeId!
      isDragging.current = nodeId
      const currentOff = dragOffsets[nodeId] || { x: 0, y: 0 }
      dragNodeStart.current = { x: currentOff.x, y: currentOff.y }
      e.preventDefault()
    } else {
      // Start panning
      isPanning.current = true
      panStart.current = { x: panRef.current.x, y: panRef.current.y }
    }

    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [dragOffsets])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didMove.current = true

    if (isPanning.current) {
      setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy })
    } else if (isDragging.current) {
      const nodeId = isDragging.current
      setDragOffsets((prev) => ({
        ...prev,
        [nodeId]: {
          x: dragNodeStart.current.x + dx,
          y: dragNodeStart.current.y + dy,
        },
      }))
    }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!didMove.current && isDragging.current) {
      // It was a click, not a drag — select the node
      selectNode(isDragging.current)
    }
    isPanning.current = false
    isDragging.current = null
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }, [selectNode])

  // Add/delete handlers (same as DialogNodeList)
  const handleAddNode = () => {
    if (!tree) return
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
    if (!tree || !selectedNodeId) return
    if (selectedNodeId === tree.root) {
      alert('Cannot delete the root node.')
      return
    }
    if (!confirm(`Delete node "${selectedNodeId}"?`)) return
    deleteNode(tree.tree_id, selectedNodeId)
  }

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

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ borderRight: '1px solid var(--border)' }}>
      {/* Header */}
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

      {/* Graph viewport */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ background: 'var(--bg-dark)', cursor: isPanning.current ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          {/* SVG edge layer */}
          <svg
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 1,
              height: 1,
              overflow: 'visible',
              pointerEvents: 'none',
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="var(--accent)" opacity="0.6" />
              </marker>
              <marker
                id="arrowhead-fallback"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="var(--text-dim)" opacity="0.6" />
              </marker>
            </defs>
            {edges.map((edge, i) => {
              const fromPos = positions[edge.from]
              const toPos = positions[edge.to]
              if (!fromPos || !toPos) return null
              const d = edgePath(fromPos, toPos)
              const isChoice = edge.kind === 'choice'
              return (
                <path
                  key={`${edge.from}-${edge.to}-${i}`}
                  d={d}
                  fill="none"
                  stroke={isChoice ? 'var(--accent)' : 'var(--text-dim)'}
                  strokeWidth={isChoice ? 1.5 : 1}
                  strokeDasharray={isChoice ? undefined : '4 3'}
                  opacity={0.5}
                  markerEnd={isChoice ? 'url(#arrowhead)' : 'url(#arrowhead-fallback)'}
                />
              )
            })}
          </svg>

          {/* Node cards */}
          {nodeIds.map((nodeId) => {
            const pos = positions[nodeId]
            if (!pos) return null
            const node = tree.nodes[nodeId]
            const selected = nodeId === selectedNodeId
            const isRoot = nodeId === tree.root

            return (
              <div
                key={nodeId}
                data-node-id={nodeId}
                className="absolute font-mono text-xs rounded select-none"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: NODE_W,
                  minHeight: NODE_H,
                  background: selected ? 'var(--accent-glow)' : 'var(--bg-panel)',
                  color: selected ? 'var(--accent)' : 'var(--text)',
                  border: selected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  padding: '6px 8px',
                  boxSizing: 'border-box',
                }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-semibold text-[11px] truncate">{nodeId}</span>
                  {isRoot && (
                    <span
                      className="px-1 py-0 text-[8px] rounded shrink-0"
                      style={{ background: 'var(--accent)', color: 'var(--bg-dark)' }}
                    >
                      ROOT
                    </span>
                  )}
                </div>
                <div
                  className="truncate"
                  style={{ color: 'var(--text-dim)', fontSize: 9, lineHeight: '12px' }}
                >
                  {summarize(node)}
                </div>
                {badgeLine(node) && (
                  <div
                    className="mt-1 truncate"
                    style={{ color: 'var(--text-dim)', fontSize: 8 }}
                  >
                    {badgeLine(node)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function summarize(node: DialogNode): string {
  if (node.action) return `[${node.action}]`
  if (node.text) {
    const clean = node.text.replace(/\n/g, ' ')
    return clean.length > 50 ? clean.slice(0, 47) + '...' : clean
  }
  return '(empty)'
}

function badgeLine(node: DialogNode): string {
  const parts: string[] = []
  if (node.choices && node.choices.length > 0) parts.push(`${node.choices.length} choice${node.choices.length > 1 ? 's' : ''}`)
  if (node.action) parts.push(node.action)
  if (node.conditions && node.conditions.length > 0) parts.push('conditional')
  if (node.effects && node.effects.length > 0) parts.push(`${node.effects.length} effect${node.effects.length > 1 ? 's' : ''}`)
  if (node.fallback) parts.push(`fb: ${node.fallback}`)
  return parts.join(' · ')
}
