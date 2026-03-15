/** RGBA color with channels 0–255 */
export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

/** A tile definition in the registry */
export interface TileDefinition {
  /** Exactly 2 characters — the tile's identity in .terrain files */
  code: string
  /** Human-readable label */
  name: string
  /** Code Page 437 glyph index (0–255) */
  glyph: number
  /** Foreground color */
  fg: RGBA
  /** Background color (a: 0 = transparent) */
  bg: RGBA
  /** Can entities traverse this tile */
  walkable: boolean
  /** Does this tile allow line-of-sight */
  transparent: boolean
  /** Does light propagate through */
  lightPass: boolean
  /** Movement speed multiplier (1.0 = normal) */
  speedMod: number
  /** Light emission radius (0 = none) */
  lightRadius: number
  /** Optional category for palette grouping */
  category?: string
}

/** The .tileregistry JSON file format */
export interface TileRegistryFile {
  version: number
  tiles: TileDefinition[]
}

/** A single cell change for undo/redo */
export interface CellChange {
  x: number
  y: number
  before: string
  after: string
}

/** An undoable operation (one paint stroke, paste, erase stroke, etc.) */
export interface Operation {
  description: string
  changes: CellChange[]
}

/** Active tool types */
export type ToolType = 'paint' | 'erase' | 'pick'

/** Rectangular selection on the map */
export interface Selection {
  x: number
  y: number
  w: number
  h: number
}
