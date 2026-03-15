import { readFileSync, writeFileSync } from 'fs'
import { importCSharpRegistry } from '../src/io/csharpImporter'
import { serializeRegistry } from '../src/io/registryFile'

const source = readFileSync('docs/TileRegistryExample.cs', 'utf-8')
const result = importCSharpRegistry(source)

if (result.errors.length > 0) {
  console.log('Warnings:')
  result.errors.forEach((e) => console.log('  ' + e))
}

// Extract categories from the C# comments
const lines = source.split('\n')
let currentCategory = 'Uncategorized'
const categoryMap = new Map<number, string>()
let regIndex = 0

for (const line of lines) {
  const catMatch = line.match(/\/\/\s*[─\-]+\s*(.+?)\s*[─\-]+/)
  if (catMatch) {
    currentCategory = catMatch[1].trim()
    continue
  }
  if (line.includes('Reg(')) {
    categoryMap.set(regIndex, currentCategory)
    regIndex++
  }
}

// Apply categories
result.tiles.forEach((tile, i) => {
  tile.category = categoryMap.get(i) || 'Uncategorized'
})

const json = serializeRegistry(result.tiles)
writeFileSync('docs/tiles.tileregistry', json, 'utf-8')

console.log(`\nConverted ${result.tiles.length} tiles → docs/tiles.tileregistry`)
