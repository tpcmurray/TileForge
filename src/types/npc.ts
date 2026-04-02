import type { RGBA } from './index'

/** A single cell in an NPC sprite or portrait grid */
export interface NpcCell {
  glyph: string
  fg: RGBA
  bg: RGBA
}

/** A grid of cells representing one state of a sprite or a portrait */
export interface NpcSpriteState {
  rows: NpcCell[][]
  width: number
  height: number
}

/** Internal editor representation of one NPC's visual data */
export interface NpcVisualData {
  id: string
  name: string
  title: string
  /** Sprite states keyed by name (e.g. "idle", "talking", "dodge_L1", etc.) */
  sprite: Record<string, NpcSpriteState>
  portrait: NpcSpriteState | null
  /** Full original JSON object — non-visual fields preserved for round-trip */
  rawJson: Record<string, unknown>
}
