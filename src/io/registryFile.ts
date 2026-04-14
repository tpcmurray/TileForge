import type { TileDefinition } from '../types'

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

  // glyph — number (legacy) or string like "176-34@5-39@5"
  if (typeof t.glyph === 'number') {
    if (t.glyph < 0 || t.glyph > 255 || !Number.isInteger(t.glyph)) {
      errors.push({ message: `Tile ${index}: glyph must be an integer 0–255`, tileIndex: index })
    }
  } else if (typeof t.glyph === 'string') {
    const parsed = parseGlyphString(t.glyph)
    if (!parsed) {
      errors.push({ message: `Tile ${index}: invalid glyph format "${t.glyph}"`, tileIndex: index })
    }
  } else {
    errors.push({ message: `Tile ${index}: glyph must be a number or string`, tileIndex: index })
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
      const t = file.tiles[i] as Record<string, unknown>
      const glyphData = typeof t.glyph === 'string'
        ? parseGlyphString(t.glyph)!
        : { glyph: t.glyph as number, variants: [] }
      const fg = t.fg as TileDefinition['fg']
      const bg = t.bg as TileDefinition['bg']
      tiles.push({
        code: t.code as string,
        name: t.name as string,
        glyph: glyphData.glyph,
        variants: glyphData.variants,
        fg: { r: fg.r, g: fg.g, b: fg.b, a: fg.a },
        bg: { r: bg.r, g: bg.g, b: bg.b, a: bg.a },
        walkable: t.walkable as boolean,
        transparent: t.transparent as boolean,
        lightPass: t.lightPass as boolean,
        above: (t.above as boolean) ?? false,
        speedMod: t.speedMod as number,
        lightRadius: t.lightRadius as number,
        noAnim: (t.noAnim as boolean) ?? false,
        ...(t.lightColor ? { lightColor: { r: (t.lightColor as any).r, g: (t.lightColor as any).g, b: (t.lightColor as any).b, a: (t.lightColor as any).a } } : {}),
        ...(t.category ? { category: t.category as string } : {}),
      })
    }
  }

  return { tiles, errors }
}

/** Serialize a TileDefinition[] to .tileregistry JSON string */
export function serializeRegistry(tiles: TileDefinition[]): string {
  const file = {
    version: 1,
    tiles: tiles.map((t) => ({
      code: t.code,
      name: t.name,
      glyph: serializeGlyphString(t.glyph, t.variants),
      fg: { ...t.fg },
      bg: { ...t.bg },
      walkable: t.walkable,
      transparent: t.transparent,
      lightPass: t.lightPass,
      above: t.above,
      speedMod: t.speedMod,
      lightRadius: t.lightRadius,
      ...(t.noAnim ? { noAnim: t.noAnim } : {}),
      ...(t.lightColor ? { lightColor: { ...t.lightColor } } : {}),
      ...(t.category ? { category: t.category } : {}),
    })),
  }
  return JSON.stringify(file, null, 2)
}

/** Parse glyph string like "176-34@5-39@5" → { glyph, variants } */
function parseGlyphString(s: string): { glyph: number; variants: { glyph: number; percent: number }[] } | null {
  const parts = s.split('-')
  const defaultGlyph = parseInt(parts[0])
  if (isNaN(defaultGlyph) || defaultGlyph < 0 || defaultGlyph > 255) return null

  const variants: { glyph: number; percent: number }[] = []
  for (let i = 1; i < parts.length; i++) {
    const match = parts[i].match(/^(\d+)@(\d+)$/)
    if (!match) return null
    const g = parseInt(match[1])
    const p = parseInt(match[2])
    if (g < 0 || g > 255 || p < 1 || p > 100) return null
    variants.push({ glyph: g, percent: p })
  }

  return { glyph: defaultGlyph, variants }
}

/** Serialize glyph + variants to string format */
function serializeGlyphString(glyph: number, variants: { glyph: number; percent: number }[]): string {
  if (!variants || variants.length === 0) return String(glyph)
  return `${glyph}-${variants.map((v) => `${v.glyph}@${v.percent}`).join('-')}`
}
