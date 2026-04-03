import type { Cutscene, CutsceneTrigger, CutsceneStep } from '../types/cutscene'

function parseTrigger(raw: Record<string, unknown>): CutsceneTrigger {
  const trigger: CutsceneTrigger = { type: String(raw.type ?? '') }
  if (raw.zone_id != null) trigger.zone_id = String(raw.zone_id)
  if (raw.npc_id != null) trigger.npc_id = String(raw.npc_id)
  if (raw.mob_id != null) trigger.mob_id = String(raw.mob_id)
  if (raw.quest_stage != null) trigger.quest_stage = Number(raw.quest_stage)
  if (raw.hp_threshold_pct != null) trigger.hp_threshold_pct = Number(raw.hp_threshold_pct)
  if (raw.flag != null) trigger.flag = String(raw.flag)
  if (raw.flag_absent != null) trigger.flag_absent = String(raw.flag_absent)
  return trigger
}

function parseStep(raw: Record<string, unknown>): CutsceneStep {
  return { ...raw, action: String(raw.action ?? '') } as CutsceneStep
}

export function parseCutsceneFile(jsonText: string): Cutscene[] {
  const data = JSON.parse(jsonText) as Record<string, unknown>
  const arr = (data.cutscenes ?? []) as Record<string, unknown>[]
  return arr.map((raw) => ({
    id: String(raw.id ?? ''),
    trigger: parseTrigger((raw.trigger ?? {}) as Record<string, unknown>),
    steps: ((raw.steps ?? []) as Record<string, unknown>[]).map(parseStep),
    rawJson: structuredClone(raw),
  }))
}

export function serializeCutsceneFile(cutscenes: Cutscene[]): string {
  const output = cutscenes.map((cs) => {
    const obj = structuredClone(cs.rawJson)
    obj.id = cs.id
    obj.trigger = structuredClone(cs.trigger) as unknown as Record<string, unknown>
    obj.steps = structuredClone(cs.steps) as unknown as Record<string, unknown>[]
    return obj
  })
  // Serialize with pretty-print, then collapse each step onto a single line
  const json = JSON.stringify({ cutscenes: output }, null, 2)
  return json.replace(
    /\{\s*\n\s*"action":\s*[\s\S]*?\n\s*\}/g,
    (match) => {
      // Only collapse objects whose first key is "action" (i.e. steps)
      const oneLine = match
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\{ /g, '{ ')
        .replace(/ \}/g, ' }')
      return oneLine
    },
  )
}
