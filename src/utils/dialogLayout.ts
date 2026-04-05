import type { DialogTree } from '../types/dialog'

export interface NodePosition {
  x: number
  y: number
}

export const NODE_W = 180
export const NODE_H = 80
const GAP_X = 40
const GAP_Y = 100

/**
 * Compute a layered DAG layout for a dialog tree.
 * BFS from root assigns layers; nodes are centered per layer.
 * Unreachable nodes are placed in a final bottom row.
 */
export function layoutDialogTree(tree: DialogTree): Record<string, NodePosition> {
  const nodeIds = Object.keys(tree.nodes)
  if (nodeIds.length === 0) return {}

  // BFS to assign layers
  const layers = new Map<string, number>()
  const queue: string[] = []

  if (tree.nodes[tree.root]) {
    queue.push(tree.root)
    layers.set(tree.root, 0)
  }

  while (queue.length > 0) {
    const id = queue.shift()!
    const node = tree.nodes[id]
    const depth = layers.get(id)!

    // Follow choice edges
    if (node.choices) {
      for (const choice of node.choices) {
        if (choice.next && tree.nodes[choice.next] && !layers.has(choice.next)) {
          layers.set(choice.next, depth + 1)
          queue.push(choice.next)
        }
      }
    }

    // Follow fallback edge
    if (node.fallback && tree.nodes[node.fallback] && !layers.has(node.fallback)) {
      layers.set(node.fallback, depth + 1)
      queue.push(node.fallback)
    }
  }

  // Collect orphan nodes (unreachable from root)
  const orphans = nodeIds.filter((id) => !layers.has(id))
  const maxLayer = layers.size > 0 ? Math.max(...layers.values()) : -1

  // Place orphans in a row below the last layer
  for (let i = 0; i < orphans.length; i++) {
    layers.set(orphans[i], maxLayer + 1)
  }

  // Group nodes by layer
  const byLayer = new Map<number, string[]>()
  for (const [id, layer] of layers) {
    if (!byLayer.has(layer)) byLayer.set(layer, [])
    byLayer.get(layer)!.push(id)
  }

  // Position each node
  const positions: Record<string, NodePosition> = {}

  for (const [layer, ids] of byLayer) {
    const rowWidth = ids.length * NODE_W + (ids.length - 1) * GAP_X
    const startX = -rowWidth / 2 + NODE_W / 2

    for (let i = 0; i < ids.length; i++) {
      positions[ids[i]] = {
        x: startX + i * (NODE_W + GAP_X) - NODE_W / 2,
        y: layer * (NODE_H + GAP_Y),
      }
    }
  }

  return positions
}

/** Compute edges for SVG rendering */
export interface GraphEdge {
  from: string
  to: string
  kind: 'choice' | 'fallback'
  label?: string
}

export function computeEdges(tree: DialogTree): GraphEdge[] {
  const edges: GraphEdge[] = []
  for (const [id, node] of Object.entries(tree.nodes)) {
    if (node.choices) {
      for (const choice of node.choices) {
        if (choice.next && tree.nodes[choice.next]) {
          edges.push({ from: id, to: choice.next, kind: 'choice', label: choice.text })
        }
      }
    }
    if (node.fallback && tree.nodes[node.fallback]) {
      edges.push({ from: id, to: node.fallback, kind: 'fallback' })
    }
  }
  return edges
}

/** Generate an SVG cubic bezier path between two nodes, based on actual positions */
export function edgePath(
  fromPos: NodePosition,
  toPos: NodePosition,
): string {
  const x1 = fromPos.x + NODE_W / 2
  const y1 = fromPos.y + NODE_H
  const x2 = toPos.x + NODE_W / 2
  const y2 = toPos.y

  // Back-edge: target is above or overlapping the source
  if (y2 < y1 + 20) {
    const offset = 40
    const rightX = Math.max(x1, x2) + NODE_W / 2 + offset
    return `M ${x1} ${y1} C ${rightX} ${y1}, ${rightX} ${y2}, ${x2} ${y2}`
  }

  // Normal downward edge: smooth cubic bezier
  const cy = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`
}
