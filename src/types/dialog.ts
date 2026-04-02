export interface DialogCondition {
  type: string
  key?: string
  op?: string
  value?: string
}

export interface DialogEffect {
  type: string
  npc?: string
  key?: string
  value?: unknown
}

export interface DialogChoice {
  text: string
  next: string
  reputation_change?: number
  conditions?: DialogCondition[]
}

export interface DialogNode {
  text?: string
  choices?: DialogChoice[]
  action?: string
  effects?: DialogEffect[]
  conditions?: DialogCondition[]
  fallback?: string
}

export interface DialogTree {
  tree_id: string
  root: string
  nodes: Record<string, DialogNode>
  rawJson: Record<string, unknown>
}
