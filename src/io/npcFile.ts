import type { RGBA } from '../types'
import type { NpcVisualData, NpcCell, NpcSpriteState } from '../types/npc'
import { dotnetColorToRGBA } from '../utils/dotnetColors'
import { rgbaToCSS } from '../rendering/tinting'

const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 255 }
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 }

function resolveColor(s: string): RGBA {
  if (!s || !s.trim()) return TRANSPARENT

  // Try .NET named color
  const named = dotnetColorToRGBA(s)
  if (named) return named

  // Try hex
  const hex = s.trim().replace(/^#/, '')
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 255,
    }
  }
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 255,
    }
  }

  return WHITE
}

function buildPalette(paletteObj: Record<string, string> | undefined): Map<string, RGBA> {
  const map = new Map<string, RGBA>()
  if (!paletteObj) return map
  for (const [key, colorStr] of Object.entries(paletteObj)) {
    map.set(key, resolveColor(colorStr))
  }
  return map
}

function expandGrid(
  artRows: string[],
  bgPalette: Map<string, RGBA>,
  bgMapRows: string[] | undefined,
  fgPalette: Map<string, RGBA>,
  fgMapRows: string[] | undefined,
  defaultFg: RGBA,
  defaultBg: RGBA,
): NpcSpriteState {
  const height = artRows.length
  const width = Math.max(...artRows.map((r) => r.length), 0)

  const rows: NpcCell[][] = []
  for (let r = 0; r < height; r++) {
    const row: NpcCell[] = []
    const artLine = artRows[r] || ''
    const bgLine = bgMapRows?.[r] || ''
    const fgLine = fgMapRows?.[r] || ''

    for (let c = 0; c < width; c++) {
      const glyph = c < artLine.length ? artLine[c] : ' '

      let bg = defaultBg
      if (c < bgLine.length && bgLine[c] !== ' ') {
        bg = bgPalette.get(bgLine[c]) ?? defaultBg
      } else if (c < bgLine.length && bgLine[c] === ' ') {
        bg = TRANSPARENT
      }

      let fg = defaultFg
      if (c < fgLine.length && fgLine[c] !== ' ') {
        fg = fgPalette.get(fgLine[c]) ?? defaultFg
      }

      row.push({ glyph, fg, bg })
    }
    rows.push(row)
  }

  return { rows, width, height }
}

export function parseNpcFile(jsonText: string): NpcVisualData[] {
  const arr = JSON.parse(jsonText) as Record<string, unknown>[]
  const result: NpcVisualData[] = []

  for (const obj of arr) {
    const id = (obj.id as string) || ''
    const name = (obj.name as string) || ''
    const title = (obj.title as string) || ''

    const asciiArt = obj.ascii_art as Record<string, string[]> | undefined

    const defaultFg = resolveColor((obj.fg_color as string) ?? '')
    const defaultBg = resolveColor((obj.bg_color as string) ?? '')

    const bgPalette = buildPalette(obj.bg_palette as Record<string, string> | undefined)
    const bgMap = obj.bg_map as Record<string, string[]> | undefined

    // Sprite fg palette (rare — most NPCs use single fg_color)
    const fgPalette = buildPalette(obj.fg_palette as Record<string, string> | undefined)
    const fgMap = obj.fg_map as Record<string, string[]> | undefined

    // Expand all sprite states from ascii_art keys
    const sprite: Record<string, NpcSpriteState> = {}
    if (asciiArt) {
      for (const [stateName, artRows] of Object.entries(asciiArt)) {
        sprite[stateName] = expandGrid(
          artRows, bgPalette, bgMap?.[stateName], fgPalette, fgMap?.[stateName], defaultFg, defaultBg,
        )
      }
    }

    // Portrait
    let portrait: NpcSpriteState | null = null
    const portraitArt = obj.dialogue_portrait as string[] | undefined
    if (portraitArt && portraitArt.length > 0) {
      const pBgPalette = buildPalette(obj.portrait_bg_palette as Record<string, string> | undefined)
      const pBgMap = obj.portrait_bg_map as string[] | undefined
      const pFgPalette = buildPalette(obj.portrait_fg_palette as Record<string, string> | undefined)
      const pFgMap = obj.portrait_fg_map as string[] | undefined
      portrait = expandGrid(portraitArt, pBgPalette, pBgMap, pFgPalette, pFgMap, defaultFg, defaultBg)
    }

    result.push({
      id,
      name,
      title,
      sprite,
      portrait,
      rawJson: obj,
    })
  }

  return result
}

// ── Serialization ──

function rgbaToHex(c: RGBA): string {
  return `#${c.r.toString(16).padStart(2, '0')}${c.g.toString(16).padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`
}

const PALETTE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function generatePaletteAndMap(
  grid: NpcSpriteState,
): { palette: Record<string, string>; map: string[] } {
  // Collect unique non-transparent colors
  const colorKey = (c: RGBA) => rgbaToCSS(c)
  const uniqueColors = new Map<string, RGBA>()
  for (const row of grid.rows) {
    for (const cell of row) {
      if (cell.bg.a === 0) continue
      const key = colorKey(cell.bg)
      if (!uniqueColors.has(key)) uniqueColors.set(key, cell.bg)
    }
  }

  // Assign palette chars
  const colorToChar = new Map<string, string>()
  const palette: Record<string, string> = {}
  let idx = 0
  for (const [key, rgba] of uniqueColors) {
    const ch = PALETTE_CHARS[idx++] || '?'
    colorToChar.set(key, ch)
    palette[ch] = rgbaToHex(rgba)
  }

  // Build map rows
  const map: string[] = []
  for (const row of grid.rows) {
    let line = ''
    for (const cell of row) {
      if (cell.bg.a === 0) {
        line += ' '
      } else {
        line += colorToChar.get(colorKey(cell.bg)) ?? ' '
      }
    }
    map.push(line)
  }

  return { palette, map }
}

function generateFgPaletteAndMap(
  grid: NpcSpriteState,
): { allSame: boolean; singleColor: string; palette: Record<string, string>; map: string[] } {
  const colorKey = (c: RGBA) => rgbaToCSS(c)
  const uniqueColors = new Map<string, RGBA>()
  for (const row of grid.rows) {
    for (const cell of row) {
      const key = colorKey(cell.fg)
      if (!uniqueColors.has(key)) uniqueColors.set(key, cell.fg)
    }
  }

  if (uniqueColors.size <= 1) {
    const first = uniqueColors.values().next().value ?? WHITE
    return { allSame: true, singleColor: rgbaToHex(first), palette: {}, map: [] }
  }

  const colorToChar = new Map<string, string>()
  const palette: Record<string, string> = {}
  let idx = 0
  for (const [key, rgba] of uniqueColors) {
    const ch = PALETTE_CHARS[idx++] || '?'
    colorToChar.set(key, ch)
    palette[ch] = rgbaToHex(rgba)
  }

  const map: string[] = []
  for (const row of grid.rows) {
    let line = ''
    for (const cell of row) {
      line += colorToChar.get(colorKey(cell.fg)) ?? ' '
    }
    map.push(line)
  }

  return { allSame: false, singleColor: '', palette, map }
}

function gridToArtRows(grid: NpcSpriteState): string[] {
  return grid.rows.map((row) => row.map((c) => c.glyph).join(''))
}

export function serializeNpcFile(npcs: NpcVisualData[]): string {
  const output: Record<string, unknown>[] = []

  for (const npc of npcs) {
    // Deep clone rawJson
    const obj = JSON.parse(JSON.stringify(npc.rawJson)) as Record<string, unknown>

    // Update basic info
    obj.id = npc.id
    obj.name = npc.name
    obj.title = npc.title

    // Rebuild ascii_art from all sprite states
    const stateNames = Object.keys(npc.sprite)
    const allGrids = Object.values(npc.sprite)

    const asciiArtObj: Record<string, string[]> = {}
    for (const stateName of stateNames) {
      asciiArtObj[stateName] = gridToArtRows(npc.sprite[stateName])
    }
    obj.ascii_art = asciiArtObj

    // Rebuild bg_palette/bg_map — merge across all states
    const mergedBgPalette: Record<string, string> = {}
    const bgColorToChar = new Map<string, string>()
    let bgIdx = 0
    for (const grid of allGrids) {
      for (const row of grid.rows) {
        for (const cell of row) {
          if (cell.bg.a === 0) continue
          const hex = rgbaToHex(cell.bg)
          if (!bgColorToChar.has(hex)) {
            const ch = PALETTE_CHARS[bgIdx++] || '?'
            mergedBgPalette[ch] = hex
            bgColorToChar.set(hex, ch)
          }
        }
      }
    }

    const rebuildBgMap = (grid: NpcSpriteState): string[] => {
      return grid.rows.map((row) =>
        row.map((cell) => {
          if (cell.bg.a === 0) return ' '
          return bgColorToChar.get(rgbaToHex(cell.bg)) ?? ' '
        }).join(''),
      )
    }

    obj.bg_palette = mergedBgPalette
    const bgMapObj: Record<string, string[]> = {}
    for (const stateName of stateNames) {
      bgMapObj[stateName] = rebuildBgMap(npc.sprite[stateName])
    }
    obj.bg_map = bgMapObj

    // Rebuild fg: check if all cells across all states share same color
    const allFgColors = new Map<string, RGBA>()
    const colorKey = (c: RGBA) => rgbaToCSS(c)
    for (const grid of allGrids) {
      for (const row of grid.rows) {
        for (const cell of row) {
          const k = colorKey(cell.fg)
          if (!allFgColors.has(k)) allFgColors.set(k, cell.fg)
        }
      }
    }

    if (allFgColors.size <= 1) {
      const first = allFgColors.values().next().value ?? WHITE
      obj.fg_color = rgbaToHex(first)
      delete obj.fg_palette
      delete obj.fg_map
    } else {
      const mergedFgPalette: Record<string, string> = {}
      const fgColorToChar = new Map<string, string>()
      let fgIdx = 0
      for (const [, rgba] of allFgColors) {
        const hex = rgbaToHex(rgba)
        if (!fgColorToChar.has(hex)) {
          const ch = PALETTE_CHARS[fgIdx++] || '?'
          mergedFgPalette[ch] = hex
          fgColorToChar.set(hex, ch)
        }
      }

      const rebuildFgMap = (grid: NpcSpriteState): string[] => {
        return grid.rows.map((row) =>
          row.map((cell) => fgColorToChar.get(rgbaToHex(cell.fg)) ?? ' ').join(''),
        )
      }

      const firstGrid = allGrids[0]
      obj.fg_color = rgbaToHex(firstGrid?.rows[0]?.[0]?.fg ?? WHITE)
      obj.fg_palette = mergedFgPalette
      const fgMapObj: Record<string, string[]> = {}
      for (const stateName of stateNames) {
        fgMapObj[stateName] = rebuildFgMap(npc.sprite[stateName])
      }
      obj.fg_map = fgMapObj
    }

    // Rebuild portrait
    if (npc.portrait) {
      obj.dialogue_portrait = gridToArtRows(npc.portrait)
      const pBg = generatePaletteAndMap(npc.portrait)
      obj.portrait_bg_palette = pBg.palette
      obj.portrait_bg_map = pBg.map

      const pFg = generateFgPaletteAndMap(npc.portrait)
      if (pFg.allSame) {
        delete obj.portrait_fg_palette
        delete obj.portrait_fg_map
      } else {
        obj.portrait_fg_palette = pFg.palette
        obj.portrait_fg_map = pFg.map
      }
    }

    output.push(obj)
  }

  return JSON.stringify(output, null, 2) + '\n'
}
