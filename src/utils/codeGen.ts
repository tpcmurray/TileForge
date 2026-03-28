const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateUniqueCode(existingTiles: Map<string, unknown>): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const a = CHARS[Math.floor(Math.random() * CHARS.length)]
    const b = CHARS[Math.floor(Math.random() * CHARS.length)]
    const code = a + b
    if (code !== '..' && !existingTiles.has(code)) return code
  }
  throw new Error('Could not generate unique 2-char code after 1000 attempts')
}
