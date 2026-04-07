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
  /** Code Page 437 glyph index (0–255), the default glyph */
  glyph: number
  /** Variant glyphs with percentage chance of appearing instead of default */
  variants: { glyph: number; percent: number }[]
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
  /** Renders above the player (e.g. tree canopy) */
  above: boolean
  /** Movement speed multiplier (1.0 = normal) */
  speedMod: number
  /** Light emission radius (0 = none) */
  lightRadius: number
  /** Disable flicker animation for non-fire light sources */
  noAnim: boolean
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
  entityChanges?: EntityChange[]
}

/** A single entity change for undo/redo */
export interface EntityChange {
  action: 'add' | 'update' | 'delete'
  before: Entity | null
  after: Entity | null
}

/** Active tool types */
export type ToolType = 'paint' | 'erase' | 'pick' | 'entity' | 'copy' | 'paste'

// ── Entity types ──

export type EntityType = 'DOOR' | 'SPAWN' | 'NPC' | 'CHEST' | 'SIGN' | 'TRIGGER' | 'LABEL' | 'WEATHER' | 'ZONE' | 'MUSIC' | 'ITEM'

interface EntityBase {
  id: string
  type: EntityType
  x: number
  y: number
}

export interface DoorEntity extends EntityBase {
  type: 'DOOR'
  w: number
  h: number
  targetZone: string
  targetX: number
  targetY: number
}

export interface SpawnEntity extends EntityBase {
  type: 'SPAWN'
  mobDefId: string
  patrol: { x1: number; y1: number; x2: number; y2: number } | null
  respawn: number | null
}

export interface NpcEntity extends EntityBase {
  type: 'NPC'
  npcDefId: string
  dialogue: string | null
  audio: { trackId: string; radius: number; volume: number } | null
}

export interface ChestEntity extends EntityBase {
  type: 'CHEST'
  lootTable: string
  itemLevel: number
}

export interface SignEntity extends EntityBase {
  type: 'SIGN'
  message: string
}

export interface TriggerEntity extends EntityBase {
  type: 'TRIGGER'
  w: number
  h: number
  cutsceneId: string
  flag: string | null
  absent: string | null
}

export interface LabelEntity extends EntityBase {
  type: 'LABEL'
  fg: string
  bg: string
  text: string
}

export interface WeatherEntity extends EntityBase {
  type: 'WEATHER'
  weatherType: string
  intensity: number
  runMin: number
  runMax: number
  pauseMin: number
  pauseMax: number
}

export interface ZoneEntity extends EntityBase {
  type: 'ZONE'
  zoneName: string
  town: boolean
  fog: number
}

export interface MusicEntity extends EntityBase {
  type: 'MUSIC'
  trackId: string
  volume: number
}

export interface ItemEntity extends EntityBase {
  type: 'ITEM'
  itemId: string
}

export type Entity = DoorEntity | SpawnEntity | NpcEntity | ChestEntity | SignEntity | TriggerEntity | LabelEntity | WeatherEntity | ZoneEntity | MusicEntity | ItemEntity

/** A snapshot of all per-map-tab state */
export interface MapDocument {
  id: string
  label: string
  cells: string[][]
  mapWidth: number
  mapHeight: number
  mapDirty: boolean
  mapFileHandle: FileSystemFileHandle | null
  entities: Entity[]
  entityComments: string[]
  entityUnknownLines: string[]
  entitiesDirty: boolean
  entitiesFileHandle: FileSystemFileHandle | null
  selectedEntityId: string | null
  undoStack: Operation[]
  redoStack: Operation[]
  zoom: number
  panX: number
  panY: number
  showGrid: boolean
}

/** Rectangular selection on the map */
export interface Selection {
  x: number
  y: number
  w: number
  h: number
}
