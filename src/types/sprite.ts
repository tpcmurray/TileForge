import type { RGBA } from './index'

/** A single cell in a sprite or portrait grid */
export interface SpriteCell {
  glyph: string
  fg: RGBA
  bg: RGBA
}

/** A grid of cells representing one state of a sprite or a portrait */
export interface SpriteState {
  rows: SpriteCell[][]
  width: number
  height: number
}

/** Internal editor representation of one sprite's visual data (NPC or Mob) */
export interface SpriteVisualData {
  id: string
  name: string
  title: string
  /** Sprite states keyed by name (e.g. "idle", "talking", "dodge_L1", etc.) */
  sprite: Record<string, SpriteState>
  portrait: SpriteState | null
  /** Full original JSON object — non-visual fields preserved for round-trip */
  rawJson: Record<string, unknown>
}
