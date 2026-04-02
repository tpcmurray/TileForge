export interface CutsceneTrigger {
  type: string
  zone_id?: string
  npc_id?: string
  mob_id?: string
  quest_stage?: number
  hp_threshold_pct?: number
  flag?: string
  flag_absent?: string
}

export interface CutsceneStep {
  action: string
  parallel?: boolean
  [key: string]: unknown
}

export interface Cutscene {
  id: string
  trigger: CutsceneTrigger
  steps: CutsceneStep[]
  rawJson: Record<string, unknown>
}
