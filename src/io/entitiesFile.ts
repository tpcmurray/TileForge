import type { Entity, DoorEntity, SpawnEntity, NpcEntity, ChestEntity, SignEntity, TriggerEntity, LabelEntity } from '../types'

export interface EntitiesParseResult {
  entities: Entity[]
  comments: string[]
  unknownLines: string[]
  errors: string[]
}

function parseCoord(s: string): { x: number; y: number } | null {
  const parts = s.split(',')
  if (parts.length !== 2) return null
  const x = parseFloat(parts[0])
  const y = parseFloat(parts[1])
  if (isNaN(x) || isNaN(y)) return null
  return { x, y }
}

function parseIntPair(s: string): { a: number; b: number } | null {
  const parts = s.split(',')
  if (parts.length !== 2) return null
  const a = parseInt(parts[0])
  const b = parseInt(parts[1])
  if (isNaN(a) || isNaN(b)) return null
  return { a, b }
}

function parseDoor(tokens: string[], lineNum: number): { entity: DoorEntity; error?: string } | { entity?: never; error: string } {
  // Full: DOOR x,y w,h target_zone target_x,target_y
  // Legacy: DOOR x,y target_zone target_x,target_y
  if (tokens.length < 4) return { error: `Line ${lineNum}: DOOR requires at least 3 arguments` }

  const pos = parseCoord(tokens[1])
  if (!pos) return { error: `Line ${lineNum}: DOOR invalid position "${tokens[1]}"` }

  // Try full format first: tokens[2] should be w,h (contains a comma with integers)
  const size = parseIntPair(tokens[2])
  if (size && tokens.length >= 5) {
    // Full format
    const target = parseCoord(tokens[4])
    if (!target) return { error: `Line ${lineNum}: DOOR invalid target position "${tokens[4]}"` }
    return {
      entity: {
        id: crypto.randomUUID(),
        type: 'DOOR',
        x: pos.x, y: pos.y,
        w: size.a, h: size.b,
        targetZone: tokens[3],
        targetX: target.x, targetY: target.y,
      },
    }
  }

  // Legacy format (no size)
  const target = parseCoord(tokens[3])
  if (!target) return { error: `Line ${lineNum}: DOOR invalid target position "${tokens[3]}"` }
  return {
    entity: {
      id: crypto.randomUUID(),
      type: 'DOOR',
      x: pos.x, y: pos.y,
      w: 1, h: 1,
      targetZone: tokens[2],
      targetX: target.x, targetY: target.y,
    },
  }
}

function parseSpawn(tokens: string[], lineNum: number): { entity: SpawnEntity; error?: string } | { entity?: never; error: string } {
  if (tokens.length < 3) return { error: `Line ${lineNum}: SPAWN requires at least 2 arguments` }

  const pos = parseCoord(tokens[2])
  if (!pos) return { error: `Line ${lineNum}: SPAWN invalid position "${tokens[2]}"` }

  let patrol: SpawnEntity['patrol'] = null
  for (let i = 3; i < tokens.length; i++) {
    if (tokens[i].startsWith('patrol:')) {
      const parts = tokens[i].slice(7).split(',')
      if (parts.length === 4) {
        const nums = parts.map(parseFloat)
        if (nums.every((n) => !isNaN(n))) {
          patrol = { x1: nums[0], y1: nums[1], x2: nums[2], y2: nums[3] }
        }
      }
    }
  }

  return {
    entity: {
      id: crypto.randomUUID(),
      type: 'SPAWN',
      x: pos.x, y: pos.y,
      mobDefId: tokens[1],
      patrol,
    },
  }
}

function parseNpc(tokens: string[], lineNum: number): { entity: NpcEntity; error?: string } | { entity?: never; error: string } {
  if (tokens.length < 3) return { error: `Line ${lineNum}: NPC requires 2 arguments` }

  const pos = parseCoord(tokens[2])
  if (!pos) return { error: `Line ${lineNum}: NPC invalid position "${tokens[2]}"` }

  return {
    entity: {
      id: crypto.randomUUID(),
      type: 'NPC',
      x: pos.x, y: pos.y,
      npcDefId: tokens[1],
    },
  }
}

function parseChest(tokens: string[], lineNum: number): { entity: ChestEntity; error?: string } | { entity?: never; error: string } {
  if (tokens.length < 4) return { error: `Line ${lineNum}: CHEST requires 3 arguments` }

  const pos = parseCoord(tokens[1])
  if (!pos) return { error: `Line ${lineNum}: CHEST invalid position "${tokens[1]}"` }

  const itemLevel = parseInt(tokens[3])
  if (isNaN(itemLevel)) return { error: `Line ${lineNum}: CHEST invalid item level "${tokens[3]}"` }

  return {
    entity: {
      id: crypto.randomUUID(),
      type: 'CHEST',
      x: pos.x, y: pos.y,
      lootTable: tokens[2],
      itemLevel,
    },
  }
}

function parseSign(tokens: string[], line: string, lineNum: number): { entity: SignEntity; error?: string } | { entity?: never; error: string } {
  if (tokens.length < 3) return { error: `Line ${lineNum}: SIGN requires position and text` }

  const pos = parseCoord(tokens[1])
  if (!pos) return { error: `Line ${lineNum}: SIGN invalid position "${tokens[1]}"` }

  // Message is everything after "SIGN x,y "
  const afterCoord = line.indexOf(tokens[1]) + tokens[1].length
  const message = line.slice(afterCoord).trim()

  return {
    entity: {
      id: crypto.randomUUID(),
      type: 'SIGN',
      x: pos.x, y: pos.y,
      message,
    },
  }
}

function parseTrigger(tokens: string[], lineNum: number): { entity: TriggerEntity; error?: string } | { entity?: never; error: string } {
  if (tokens.length < 4) return { error: `Line ${lineNum}: TRIGGER requires at least 3 arguments` }

  const pos = parseCoord(tokens[1])
  if (!pos) return { error: `Line ${lineNum}: TRIGGER invalid position "${tokens[1]}"` }

  const size = parseIntPair(tokens[2])
  if (!size) return { error: `Line ${lineNum}: TRIGGER invalid size "${tokens[2]}"` }

  let flag: string | null = null
  let absent: string | null = null
  for (let i = 4; i < tokens.length; i++) {
    if (tokens[i].startsWith('flag:')) flag = tokens[i].slice(5)
    else if (tokens[i].startsWith('absent:')) absent = tokens[i].slice(7)
  }

  return {
    entity: {
      id: crypto.randomUUID(),
      type: 'TRIGGER',
      x: pos.x, y: pos.y,
      w: size.a, h: size.b,
      cutsceneId: tokens[3] ?? '',
      flag,
      absent,
    },
  }
}

/** Check if a token looks like a color: named color or #hex */
function isColorToken(s: string): boolean {
  if (s.startsWith('#')) return true
  const named = s.toLowerCase()
  return ['white', 'black', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
    'orange', 'purple', 'gold', 'silver', 'gray', 'grey', 'transparent'].includes(named)
}

function parseLabel(tokens: string[], line: string, lineNum: number): { entity: LabelEntity; error?: string } | { entity?: never; error: string } {
  // LABEL x,y fg bg text...
  if (tokens.length < 5) return { error: `Line ${lineNum}: LABEL requires position, fg, bg, and text` }

  const pos = parseCoord(tokens[1])
  if (!pos) return { error: `Line ${lineNum}: LABEL invalid position "${tokens[1]}"` }

  const fg = tokens[2]
  const bg = tokens[3]

  if (!isColorToken(fg)) return { error: `Line ${lineNum}: LABEL invalid foreground color "${fg}"` }
  if (!isColorToken(bg)) return { error: `Line ${lineNum}: LABEL invalid background color "${bg}"` }

  // Text is everything after the 4th token
  // Find position of the bg token in the line, then take everything after it
  let afterBg = 0
  let tokensSeen = 0
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== ' ' && line[i] !== '\t') {
      // Find end of this token
      let j = i
      while (j < line.length && line[j] !== ' ' && line[j] !== '\t') j++
      tokensSeen++
      if (tokensSeen === 4) {
        afterBg = j
        break
      }
      i = j - 1
    }
  }
  const text = line.slice(afterBg).trim()
  if (!text) return { error: `Line ${lineNum}: LABEL requires text` }

  return {
    entity: {
      id: crypto.randomUUID(),
      type: 'LABEL',
      x: pos.x, y: pos.y,
      fg, bg, text,
    },
  }
}

export function parseEntities(text: string): EntitiesParseResult {
  const lines = text.split(/\r?\n/)
  const entities: Entity[] = []
  const comments: string[] = []
  const unknownLines: string[] = []
  const errors: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '' || line.startsWith('#')) {
      comments.push(lines[i])
      continue
    }

    const tokens = line.split(/\s+/)
    const cmd = tokens[0].toUpperCase()
    let result: { entity?: Entity; error?: string }

    switch (cmd) {
      case 'DOOR':
      case 'TRANSFER':
        result = parseDoor(tokens, i + 1)
        break
      case 'SPAWN':
        result = parseSpawn(tokens, i + 1)
        break
      case 'NPC':
        result = parseNpc(tokens, i + 1)
        break
      case 'CHEST':
        result = parseChest(tokens, i + 1)
        break
      case 'SIGN':
        result = parseSign(tokens, line, i + 1)
        break
      case 'TRIGGER':
        result = parseTrigger(tokens, i + 1)
        break
      case 'LABEL':
        result = parseLabel(tokens, line, i + 1)
        break
      default:
        unknownLines.push(lines[i])
        continue
    }

    if (result.error) errors.push(result.error)
    if (result.entity) entities.push(result.entity)
  }

  return { entities, comments, unknownLines, errors }
}

function serializeEntity(e: Entity): string {
  switch (e.type) {
    case 'DOOR': {
      const isUnit = e.w === 1 && e.h === 1
      return isUnit
        ? `DOOR ${e.x},${e.y} ${e.targetZone} ${e.targetX},${e.targetY}`
        : `DOOR ${e.x},${e.y} ${e.w},${e.h} ${e.targetZone} ${e.targetX},${e.targetY}`
    }
    case 'SPAWN': {
      let line = `SPAWN ${e.mobDefId} ${e.x},${e.y}`
      if (e.patrol) line += ` patrol:${e.patrol.x1},${e.patrol.y1},${e.patrol.x2},${e.patrol.y2}`
      return line
    }
    case 'NPC':
      return `NPC ${e.npcDefId} ${e.x},${e.y}`
    case 'CHEST':
      return `CHEST ${e.x},${e.y} ${e.lootTable} ${e.itemLevel}`
    case 'SIGN':
      return `SIGN ${e.x},${e.y} ${e.message}`
    case 'TRIGGER': {
      let line = `TRIGGER ${e.x},${e.y} ${e.w},${e.h} ${e.cutsceneId}`
      if (e.flag) line += ` flag:${e.flag}`
      if (e.absent) line += ` absent:${e.absent}`
      return line
    }
    case 'LABEL':
      return `LABEL ${e.x},${e.y} ${e.fg} ${e.bg} ${e.text}`
  }
}

export function serializeEntities(
  entities: Entity[],
  comments: string[],
  unknownLines: string[],
): string {
  const parts: string[] = []

  // Comments first
  if (comments.length > 0) {
    parts.push(...comments)
    // Add blank line separator if comments don't end with one
    if (comments[comments.length - 1].trim() !== '') parts.push('')
  }

  // Group entities by type for readability
  const typeOrder: Entity['type'][] = ['SPAWN', 'NPC', 'CHEST', 'SIGN', 'DOOR', 'TRIGGER', 'LABEL']
  for (const type of typeOrder) {
    const group = entities.filter((e) => e.type === type)
    if (group.length === 0) continue
    for (const e of group) {
      parts.push(serializeEntity(e))
    }
    parts.push('')
  }

  // Unknown lines preserved at end
  if (unknownLines.length > 0) {
    parts.push(...unknownLines)
    parts.push('')
  }

  return parts.join('\n').trimEnd() + '\n'
}
