export interface TerrainParseResult {
  cells: string[][]
  width: number
  height: number
  unknownCodes: Set<string>
}

/**
 * Parse a .terrain file into a 2D array of tile codes.
 * Width is inferred from the first line (line.length / 2).
 * Unknown codes are flagged but preserved.
 */
export function parseTerrain(
  text: string,
  knownCodes?: Set<string>
): TerrainParseResult {
  const lines = text.split('\n').filter((l) => l.length > 0)
  if (lines.length === 0) {
    return { cells: [], width: 0, height: 0, unknownCodes: new Set() }
  }

  const width = Math.floor(lines[0].length / 2)
  const unknownCodes = new Set<string>()
  const cells: string[][] = []

  for (let y = 0; y < lines.length; y++) {
    const line = lines[y]
    const row: string[] = []
    for (let x = 0; x < width; x++) {
      const code = line.substring(x * 2, x * 2 + 2)
      if (code.length === 2) {
        row.push(code)
        if (knownCodes && !knownCodes.has(code)) {
          unknownCodes.add(code)
        }
      }
    }
    cells.push(row)
  }

  return { cells, width, height: cells.length, unknownCodes }
}

/** Serialize a 2D cell array to .terrain file text */
export function serializeTerrain(cells: string[][]): string {
  return cells.map((row) => row.join('')).join('\n')
}
