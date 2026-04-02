import type { DialogTree, DialogNode, DialogChoice, DialogCondition, DialogEffect } from '../types/dialog'

function parseCondition(raw: Record<string, unknown>): DialogCondition {
  return {
    type: String(raw.type ?? ''),
    key: raw.key != null ? String(raw.key) : undefined,
    op: raw.op != null ? String(raw.op) : undefined,
    value: raw.value != null ? String(raw.value) : undefined,
  }
}

function parseEffect(raw: Record<string, unknown>): DialogEffect {
  return {
    type: String(raw.type ?? ''),
    npc: raw.npc != null ? String(raw.npc) : undefined,
    key: raw.key != null ? String(raw.key) : undefined,
    value: raw.value,
  }
}

function parseChoice(raw: Record<string, unknown>): DialogChoice {
  const choice: DialogChoice = {
    text: String(raw.text ?? ''),
    next: String(raw.next ?? ''),
  }
  if (raw.reputation_change != null) choice.reputation_change = Number(raw.reputation_change)
  if (Array.isArray(raw.conditions)) choice.conditions = raw.conditions.map((c: Record<string, unknown>) => parseCondition(c))
  return choice
}

function parseNode(raw: Record<string, unknown>): DialogNode {
  const node: DialogNode = {}
  if (raw.text != null) node.text = String(raw.text)
  if (Array.isArray(raw.choices)) node.choices = raw.choices.map((c: Record<string, unknown>) => parseChoice(c))
  if (raw.action != null) node.action = String(raw.action)
  if (Array.isArray(raw.effects)) node.effects = raw.effects.map((e: Record<string, unknown>) => parseEffect(e))
  if (Array.isArray(raw.conditions)) node.conditions = raw.conditions.map((c: Record<string, unknown>) => parseCondition(c))
  if (raw.fallback != null) node.fallback = String(raw.fallback)
  return node
}

export function parseDialogFile(jsonText: string): DialogTree[] {
  const arr = JSON.parse(jsonText) as Record<string, unknown>[]
  return arr.map((raw) => {
    const nodes: Record<string, DialogNode> = {}
    const rawNodes = (raw.nodes ?? {}) as Record<string, Record<string, unknown>>
    for (const [id, rawNode] of Object.entries(rawNodes)) {
      nodes[id] = parseNode(rawNode)
    }
    return {
      tree_id: String(raw.tree_id ?? ''),
      root: String(raw.root ?? ''),
      nodes,
      rawJson: structuredClone(raw),
    }
  })
}

export function serializeDialogFile(trees: DialogTree[]): string {
  const output = trees.map((tree) => {
    const obj = structuredClone(tree.rawJson)
    obj.tree_id = tree.tree_id
    obj.root = tree.root
    obj.nodes = structuredClone(tree.nodes) as unknown as Record<string, unknown>
    return obj
  })
  return JSON.stringify(output, null, 2)
}
