import type { TileDefinition, RGBA } from '../types'
import { unicodeToCP437 } from '../utils/cp437'
import { dotnetColorToRGBA } from '../utils/dotnetColors'

export interface ImportResult {
  tiles: TileDefinition[]
  errors: string[]
}

/**
 * Parse a C# TileRegistry source file and extract all Reg(...) calls
 * into TileDefinition[].
 */
export function importCSharpRegistry(source: string): ImportResult {
  const tiles: TileDefinition[] = []
  const errors: string[] = []

  // Match Reg(...) calls, handling nested parentheses
  const regCalls = extractRegCalls(source)

  for (let i = 0; i < regCalls.length; i++) {
    try {
      const tile = parseRegCall(regCalls[i])
      if (tile) {
        tiles.push(tile)
      }
    } catch (e) {
      errors.push(`Reg call ${i + 1}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { tiles, errors }
}

function extractRegCalls(source: string): string[] {
  const calls: string[] = []
  const pattern = /\bReg\s*\(/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(source)) !== null) {
    const start = match.index + match[0].length
    let depth = 1
    let pos = start
    while (pos < source.length && depth > 0) {
      if (source[pos] === '(') depth++
      else if (source[pos] === ')') depth--
      pos++
    }
    if (depth === 0) {
      calls.push(source.substring(start, pos - 1))
    }
  }

  return calls
}

function splitArgs(argsStr: string): string[] {
  const args: string[] = []
  let depth = 0
  let current = ''

  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i]
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    else if (ch === ',' && depth === 0) {
      args.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) {
    args.push(current.trim())
  }

  return args
}

function parseColor(expr: string): RGBA {
  const trimmed = expr.trim()

  // new Color(r, g, b) or new Color(r, g, b, a)
  const newColorMatch = trimmed.match(
    /new\s+Color\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/
  )
  if (newColorMatch) {
    return {
      r: parseInt(newColorMatch[1]),
      g: parseInt(newColorMatch[2]),
      b: parseInt(newColorMatch[3]),
      a: newColorMatch[4] ? parseInt(newColorMatch[4]) : 255,
    }
  }

  // Color.Name
  const colorNameMatch = trimmed.match(/Color\.(\w+)/)
  if (colorNameMatch) {
    const rgba = dotnetColorToRGBA(trimmed)
    if (rgba) return rgba
    throw new Error(`Unknown .NET color: ${trimmed}`)
  }

  throw new Error(`Cannot parse color: ${trimmed}`)
}

function parseCharLiteral(expr: string): number {
  const trimmed = expr.trim()

  // '\uXXXX' unicode escape
  const unicodeMatch = trimmed.match(/^'\\u([0-9a-fA-F]{4})'$/)
  if (unicodeMatch) {
    const char = String.fromCharCode(parseInt(unicodeMatch[1], 16))
    const cp437 = unicodeToCP437(char)
    if (cp437 !== undefined) return cp437
    throw new Error(`Unicode char \\u${unicodeMatch[1]} has no CP437 mapping`)
  }

  // 'c' single char
  const charMatch = trimmed.match(/^'(.)'$/)
  if (charMatch) {
    const cp437 = unicodeToCP437(charMatch[1])
    if (cp437 !== undefined) return cp437
    // Fallback: try char code for basic ASCII
    const code = charMatch[1].charCodeAt(0)
    if (code >= 32 && code <= 126) return code
    throw new Error(`Character '${charMatch[1]}' has no CP437 mapping`)
  }

  // Direct integer literal
  const numMatch = trimmed.match(/^\d+$/)
  if (numMatch) {
    return parseInt(trimmed)
  }

  // (char) cast expression like (char)0xB7
  const castMatch = trimmed.match(/\(char\)\s*0x([0-9a-fA-F]+)/i)
  if (castMatch) {
    const code = parseInt(castMatch[1], 16)
    const char = String.fromCharCode(code)
    const cp437 = unicodeToCP437(char)
    if (cp437 !== undefined) return cp437
    if (code >= 32 && code <= 126) return code
    throw new Error(`Cast expression ${trimmed} has no CP437 mapping`)
  }

  throw new Error(`Cannot parse character: ${trimmed}`)
}

function parseRegCall(argsStr: string): TileDefinition | null {
  const args = splitArgs(argsStr)
  if (args.length < 6) {
    throw new Error(`Expected at least 6 arguments, got ${args.length}: ${argsStr.substring(0, 80)}`)
  }

  // Parse positional args: code, name, glyph, fg, bg, walkable, transparent, lightPass
  // The exact parameter order may vary; common pattern:
  // Reg("code", "name", 'glyph', Color.FG, Color.BG, walkable, transparent, lightPass, ...)

  const code = parseStringLiteral(args[0])
  const name = parseStringLiteral(args[1])
  const glyph = parseCharLiteral(args[2])
  const fg = parseColor(args[3])
  const bg = parseColor(args[4])

  // Remaining positional boolean args
  const walkable = parseBool(args[5])
  const transparent = args.length > 6 ? parseBool(args[6]) : true
  const lightPass = args.length > 7 ? parseBool(args[7]) : true

  // Named optional params
  let speedMod = 1.0
  let lightRadius = 0

  for (let i = 5; i < args.length; i++) {
    const named = args[i].match(/(\w+)\s*:\s*(.+)/)
    if (named) {
      const key = named[1].toLowerCase()
      const val = named[2].trim()
      if (key === 'speedmod') speedMod = parseFloat(val) || 1.0
      else if (key === 'lightradius') lightRadius = parseInt(val) || 0
    }
  }

  return {
    code,
    name,
    glyph,
    fg,
    bg,
    walkable,
    transparent,
    lightPass,
    speedMod,
    lightRadius,
  }
}

function parseStringLiteral(expr: string): string {
  const trimmed = expr.trim()
  // "string" or @"string"
  const match = trimmed.match(/^@?"((?:[^"\\]|\\.)*)"$/)
  if (match) return match[1].replace(/\\"/g, '"')
  throw new Error(`Cannot parse string: ${trimmed}`)
}

function parseBool(expr: string): boolean {
  const trimmed = expr.trim().toLowerCase()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  // Check for named param like "walkable: true"
  const named = trimmed.match(/\w+\s*:\s*(true|false)/)
  if (named) return named[1] === 'true'
  throw new Error(`Cannot parse boolean: ${expr}`)
}
