import type { TileDefinition, TileRegistryFile, RGBA } from '../types'

export interface RegistryParseError {
  message: string
  tileIndex?: number
}

export interface RegistryParseResult {
  tiles: TileDefinition[]
  errors: RegistryParseError[]
}

function validateRGBA(color: unknown, field: string, tileIndex: number): RegistryParseError[] {
  const errors: RegistryParseError[] = []
  if (!color || typeof color !== 'object') {
    errors.push({ message: `Tile ${tileIndex}: ${field} must be an RGBA object`, tileIndex })
    return errors
  }
  const c = color as Record<string, unknown>
  for (const ch of ['r', 'g', 'b', 'a']) {
    if (typeof c[ch] !== 'number' || c[ch] < 0 || c[ch] > 255) {
      errors.push({
        message: `Tile ${tileIndex}: ${field}.${ch} must be a number 0–255`,
        tileIndex,
      })
    }
  }
  return errors
}

function validateTile(tile: unknown, index: number, seenCodes: Set<string>): RegistryParseError[] {
  const errors: RegistryParseError[] = []
  if (!tile || typeof tile !== 'object') {
    errors.push({ message: `Tile ${index}: must be an object`, tileIndex: index })
    return errors
  }

  const t = tile as Record<string, unknown>

  // code
  if (typeof t.code !== 'string' || t.code.length !== 2) {
    errors.push({ message: `Tile ${index}: code must be exactly 2 characters`, tileIndex: index })
  } else if (seenCodes.has(t.code)) {
    errors.push({ message: `Tile ${index}: duplicate code "${t.code}"`, tileIndex: index })
  } else {
    seenCodes.add(t.code)
  }

  // name
  if (typeof t.name !== 'string') {
    errors.push({ message: `Tile ${index}: name must be a string`, tileIndex: index })
  }

  // glyph
  if (typeof t.glyph !== 'number' || t.glyph < 0 || t.glyph > 255 || !Number.isInteger(t.glyph)) {
    errors.push({ message: `Tile ${index}: glyph must be an integer 0–255`, tileIndex: index })
  }

  // colors
  errors.push(...validateRGBA(t.fg, 'fg', index))
  errors.push(...validateRGBA(t.bg, 'bg', index))

  // booleans
  for (const field of ['walkable', 'transparent', 'lightPass']) {
    if (typeof t[field] !== 'boolean') {
      errors.push({ message: `Tile ${index}: ${field} must be a boolean`, tileIndex: index })
    }
  }
  // above is optional for backwards compat
  if (t.above !== undefined && typeof t.above !== 'boolean') {
    errors.push({ message: `Tile ${index}: above must be a boolean`, tileIndex: index })
  }

  // numbers
  if (typeof t.speedMod !== 'number') {
    errors.push({ message: `Tile ${index}: speedMod must be a number`, tileIndex: index })
  }
  if (typeof t.lightRadius !== 'number') {
    errors.push({ message: `Tile ${index}: lightRadius must be a number`, tileIndex: index })
  }

  return errors
}

/** Parse a .tileregistry JSON string into TileDefinition[], with validation */
export function parseRegistry(json: string): RegistryParseResult {
  const errors: RegistryParseError[] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { tiles: [], errors: [{ message: 'Invalid JSON' }] }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { tiles: [], errors: [{ message: 'Root must be an object' }] }
  }

  const file = parsed as Record<string, unknown>
  if (file.version !== 1) {
    errors.push({ message: `Unsupported version: ${file.version}` })
  }

  if (!Array.isArray(file.tiles)) {
    return { tiles: [], errors: [{ message: '"tiles" must be an array' }] }
  }

  const seenCodes = new Set<string>()
  const tiles: TileDefinition[] = []

  for (let i = 0; i < file.tiles.length; i++) {
    const tileErrors = validateTile(file.tiles[i], i, seenCodes)
    errors.push(...tileErrors)

    if (tileErrors.length === 0) {
      const t = file.tiles[i] as TileDefinition
      tiles.push({
        code: t.code,
        name: t.name,
        glyph: t.glyph,
        fg: { r: t.fg.r, g: t.fg.g, b: t.fg.b, a: t.fg.a },
        bg: { r: t.bg.r, g: t.bg.g, b: t.bg.b, a: t.bg.a },
        walkable: t.walkable,
        transparent: t.transparent,
        lightPass: t.lightPass,
        above: t.above ?? false,
        speedMod: t.speedMod,
        lightRadius: t.lightRadius,
        ...(t.category ? { category: t.category } : {}),
      })
    }
  }

  return { tiles, errors }
}

/** Serialize a TileDefinition[] to .tileregistry JSON string */
export function serializeRegistry(tiles: TileDefinition[]): string {
  const file: TileRegistryFile = {
    version: 1,
    tiles: tiles.map((t) => ({
      code: t.code,
      name: t.name,
      glyph: t.glyph,
      fg: { ...t.fg },
      bg: { ...t.bg },
      walkable: t.walkable,
      transparent: t.transparent,
      lightPass: t.lightPass,
      above: t.above,
      speedMod: t.speedMod,
      lightRadius: t.lightRadius,
      ...(t.category ? { category: t.category } : {}),
    })),
  }
  return JSON.stringify(file, null, 2)
}
