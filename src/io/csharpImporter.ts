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

/**
 * Extract Reg(...) call bodies from source, correctly handling
 * string/char literals that contain parentheses, brackets, or commas.
 */
function extractRegCalls(source: string): string[] {
  const calls: string[] = []
  const pattern = /\bReg\s*\(/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(source)) !== null) {
    const start = match.index + match[0].length
    let depth = 1
    let pos = start
    let inString = false
    let inChar = false

    while (pos < source.length && depth > 0) {
      const ch = source[pos]
      const prev = pos > 0 ? source[pos - 1] : ''

      if (inString) {
        if (ch === '"' && prev !== '\\') inString = false
      } else if (inChar) {
        if (ch === "'" && prev !== '\\') inChar = false
      } else {
        if (ch === '"') inString = true
        else if (ch === "'") inChar = true
        else if (ch === '(') depth++
        else if (ch === ')') depth--
      }
      pos++
    }
    if (depth === 0) {
      calls.push(source.substring(start, pos - 1))
    }
  }

  return calls
}

/**
 * Split arguments, respecting string/char literals and nested parens.
 */
function splitArgs(argsStr: string): string[] {
  const args: string[] = []
  let depth = 0
  let current = ''
  let inString = false
  let inChar = false

  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i]
    const prev = i > 0 ? argsStr[i - 1] : ''

    if (inString) {
      current += ch
      if (ch === '"' && prev !== '\\') inString = false
      continue
    }
    if (inChar) {
      current += ch
      if (ch === "'" && prev !== '\\') inChar = false
      continue
    }

    if (ch === '"') { inString = true; current += ch; continue }
    if (ch === "'") { inChar = true; current += ch; continue }

    if (ch === '(') depth++
    else if (ch === ')') depth--
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

/**
 * Parse a C# char literal to a CP437 glyph index.
 * Falls back to closest CP437 match or raw Unicode codepoint for unmapped chars.
 */
function parseCharLiteral(expr: string): number {
  const trimmed = expr.trim()

  // '\uXXXX' unicode escape
  const unicodeMatch = trimmed.match(/^'\\u([0-9a-fA-F]{4})'$/)
  if (unicodeMatch) {
    const codepoint = parseInt(unicodeMatch[1], 16)
    const char = String.fromCharCode(codepoint)
    const cp437 = unicodeToCP437(char)
    if (cp437 !== undefined) return cp437
    // Fallback: find a reasonable substitute or use a placeholder
    return unicodeFallback(codepoint)
  }

  // 'c' single char
  const charMatch = trimmed.match(/^'(.)'$/)
  if (charMatch) {
    const cp437 = unicodeToCP437(charMatch[1])
    if (cp437 !== undefined) return cp437
    const code = charMatch[1].charCodeAt(0)
    if (code >= 32 && code <= 126) return code
    return unicodeFallback(code)
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
    return unicodeFallback(code)
  }

  throw new Error(`Cannot parse character: ${trimmed}`)
}

/** Map unmapped Unicode codepoints to reasonable CP437 substitutes */
function unicodeFallback(codepoint: number): number {
  const fallbacks: Record<number, number> = {
    0x25CA: 4,    // ◊ lozenge → ♦ (CP437 4)
    0x2668: 15,   // ♨ hot springs → ☼ (CP437 15)
    0x273F: 42,   // ✿ flower → * (CP437 42)
    0x273E: 42,   // ✾ flower → * (CP437 42)
    0x2573: 88,   // ╳ box drawings X → X (CP437 88)
    0x03A9: 234,  // Ω omega → Ω (CP437 234)
  }
  if (fallbacks[codepoint] !== undefined) return fallbacks[codepoint]
  // Last resort: use a question mark
  return 63 // '?'
}

function parseRegCall(argsStr: string): TileDefinition | null {
  // Strip trailing C# comments from args
  const cleaned = argsStr.replace(/\/\/.*$/gm, '')
  const args = splitArgs(cleaned)

  if (args.length < 6) {
    throw new Error(`Expected at least 6 arguments, got ${args.length}: ${argsStr.substring(0, 80)}`)
  }

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
  let above = false

  for (let i = 5; i < args.length; i++) {
    const named = args[i].match(/(\w+)\s*:\s*(.+)/)
    if (named) {
      const key = named[1].toLowerCase()
      const val = named[2].trim()
      if (key === 'speedmod') speedMod = parseFloat(val) || 1.0
      else if (key === 'lightradius') lightRadius = parseInt(val) || 0
      else if (key === 'above') above = val.toLowerCase() === 'true'
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
    above,
    speedMod,
    lightRadius,
  }
}

function parseStringLiteral(expr: string): string {
  const trimmed = expr.trim()
  const match = trimmed.match(/^@?"((?:[^"\\]|\\.)*)"$/)
  if (match) return match[1].replace(/\\"/g, '"')
  throw new Error(`Cannot parse string: ${trimmed}`)
}

function parseBool(expr: string): boolean {
  const trimmed = expr.trim().toLowerCase()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  const named = trimmed.match(/\w+\s*:\s*(true|false)/)
  if (named) return named[1] === 'true'
  throw new Error(`Cannot parse boolean: ${expr}`)
}
