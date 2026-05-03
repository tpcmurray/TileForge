import type { DialogTree } from '../types/dialog'

export interface NodePosition {
  x: number
  y: number
}

export const NODE_W = 180
export const NODE_H = 80
const GAP_X = 40
const GAP_Y = 100
const MIN_X = NODE_W + GAP_X

/**
 * Layered DAG layout for a dialog tree.
 *
 * 1. DFS from root identifies cycles. Edges that close a cycle are demoted to "back-edges"
 *    so the rest of the graph is treated as a DAG.
 * 2. Layers are assigned by longest-path-from-source via Kahn's algorithm — guaranteeing
 *    every forward edge points strictly to a deeper layer (i.e. arrows go down).
 * 3. Within each layer, nodes are placed at the barycenter of their parents' x. A
 *    forward+backward sweep enforces minimum horizontal spacing while staying close to
 *    each node's barycenter, producing a staggered layout aligned with the parents above.
 * 4. Orphan nodes (unreachable from root) are placed in a final row beneath the tree.
 */
export function layoutDialogTree(tree: DialogTree): Record<string, NodePosition> {
  const nodeIds = Object.keys(tree.nodes)
  if (nodeIds.length === 0) return {}

  // ── Build adjacency (deduped, valid targets only) ──
  const out = new Map<string, string[]>()
  for (const id of nodeIds) {
    const node = tree.nodes[id]
    const seen = new Set<string>()
    const children: string[] = []
    if (node.choices) {
      for (const c of node.choices) {
        if (c.next && tree.nodes[c.next] && !seen.has(c.next)) {
          children.push(c.next)
          seen.add(c.next)
        }
      }
    }
    if (node.fallback && tree.nodes[node.fallback] && !seen.has(node.fallback)) {
      children.push(node.fallback)
    }
    out.set(id, children)
  }

  // ── DFS from root: identify reachable set + back-edges (iterative to avoid stack overflow) ──
  const reachable = new Set<string>()
  const backEdge = new Set<string>()
  const color = new Map<string, 1 | 2>() // 1 = on stack, 2 = finished

  const edgeKey = (u: string, v: string): string => `${u}\x00${v}`

  if (tree.nodes[tree.root]) {
    const stack: { id: string; idx: number }[] = []
    stack.push({ id: tree.root, idx: 0 })
    color.set(tree.root, 1)
    reachable.add(tree.root)
    while (stack.length > 0) {
      const top = stack[stack.length - 1]
      const children = out.get(top.id) ?? []
      if (top.idx >= children.length) {
        color.set(top.id, 2)
        stack.pop()
        continue
      }
      const v = children[top.idx++]
      if (color.get(v) === 1) {
        backEdge.add(edgeKey(top.id, v))
      } else if (!color.has(v)) {
        color.set(v, 1)
        reachable.add(v)
        stack.push({ id: v, idx: 0 })
      }
    }
  }

  const isForward = (u: string, v: string): boolean =>
    reachable.has(v) && !backEdge.has(edgeKey(u, v))

  // ── Forward parents map ──
  const forwardParents = new Map<string, string[]>()
  for (const id of reachable) forwardParents.set(id, [])
  for (const u of reachable) {
    for (const v of out.get(u) ?? []) {
      if (isForward(u, v)) forwardParents.get(v)!.push(u)
    }
  }

  // ── Longest-path layering via Kahn's algorithm ──
  const layer = new Map<string, number>()
  const inDeg = new Map<string, number>()
  for (const id of reachable) inDeg.set(id, forwardParents.get(id)!.length)

  const queue: string[] = []
  for (const [id, d] of inDeg) {
    if (d === 0) {
      queue.push(id)
      layer.set(id, 0)
    }
  }

  while (queue.length > 0) {
    const u = queue.shift()!
    const ul = layer.get(u)!
    for (const v of out.get(u) ?? []) {
      if (!isForward(u, v)) continue
      const newL = ul + 1
      if ((layer.get(v) ?? -1) < newL) layer.set(v, newL)
      const d = inDeg.get(v)! - 1
      inDeg.set(v, d)
      if (d === 0) queue.push(v)
    }
  }

  // ── Orphans (unreachable from root) go in a final row ──
  const reachLayers = [...layer.values()]
  const maxReachLayer = reachLayers.length > 0 ? Math.max(...reachLayers) : -1
  const orphans = nodeIds.filter((id) => !reachable.has(id))
  for (const o of orphans) layer.set(o, maxReachLayer + 1)

  // ── Group by layer ──
  const byLayer = new Map<number, string[]>()
  for (const [id, l] of layer) {
    if (!byLayer.has(l)) byLayer.set(l, [])
    byLayer.get(l)!.push(id)
  }
  const layerNums = [...byLayer.keys()].sort((a, b) => a - b)

  const positions: Record<string, NodePosition> = {}

  const placeEven = (ids: string[], y: number) => {
    const sorted = [...ids].sort((a, b) => {
      if (a === tree.root) return -1
      if (b === tree.root) return 1
      return a.localeCompare(b)
    })
    const total = sorted.length * NODE_W + Math.max(0, sorted.length - 1) * GAP_X
    const left = -total / 2
    for (let i = 0; i < sorted.length; i++) {
      positions[sorted[i]] = { x: left + i * MIN_X, y }
    }
  }

  for (let li = 0; li < layerNums.length; li++) {
    const l = layerNums[li]
    const ids = byLayer.get(l)!
    const y = l * (NODE_H + GAP_Y)

    // Source-only layer (top layer of root, or orphan row): even spacing centered on 0
    const isSourceLayer = ids.every((id) => (forwardParents.get(id) ?? []).length === 0)
    if (isSourceLayer) {
      placeEven(ids, y)
      continue
    }

    // Barycenter of already-placed forward parents
    const desired = new Map<string, number>()
    for (const id of ids) {
      const parents = (forwardParents.get(id) ?? []).filter((p) => positions[p])
      if (parents.length > 0) {
        const sum = parents.reduce((s, p) => s + positions[p].x, 0)
        desired.set(id, sum / parents.length)
      } else {
        desired.set(id, 0)
      }
    }

    ids.sort((a, b) => {
      const da = desired.get(a)!
      const db = desired.get(b)!
      if (da !== db) return da - db
      return a.localeCompare(b)
    })

    const xs = ids.map((id) => desired.get(id)!)

    // Forward sweep: enforce min spacing left-to-right
    for (let i = 1; i < xs.length; i++) {
      if (xs[i] < xs[i - 1] + MIN_X) xs[i] = xs[i - 1] + MIN_X
    }
    // Backward sweep: pull each node toward its desired x where slack permits
    for (let i = xs.length - 2; i >= 0; i--) {
      const desX = desired.get(ids[i])!
      const maxX = xs[i + 1] - MIN_X
      const minX = i > 0 ? xs[i - 1] + MIN_X : -Infinity
      let target = xs[i]
      if (desX > target && desX <= maxX) target = desX
      if (target > maxX) target = maxX
      if (target < minX) target = minX
      xs[i] = target
    }

    for (let i = 0; i < ids.length; i++) {
      positions[ids[i]] = { x: xs[i], y }
    }
  }

  return positions
}

// ── Edge computation (unchanged API) ──

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
