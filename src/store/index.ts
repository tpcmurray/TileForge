import { create } from 'zustand'
import type {
  TileDefinition,
  ToolType,
  Selection,
  Operation,
  Entity,
  EntityChange,
} from '../types'

export interface TileForgeState {
  // ── Registry Slice ──
  tiles: Map<string, TileDefinition>
  registryDirty: boolean
  addTile: (tile: TileDefinition) => void
  updateTile: (code: string, tile: TileDefinition) => void
  deleteTile: (code: string) => void
  loadRegistry: (tiles: TileDefinition[]) => void

  // ── Map Slice ──
  mapWidth: number
  mapHeight: number
  cells: string[][]
  mapDirty: boolean
  setCell: (x: number, y: number, code: string) => void
  setCellRange: (changes: { x: number; y: number; code: string }[]) => void
  loadMap: (cells: string[][], width: number, height: number) => void
  clearMap: (width: number, height: number, fillCode: string) => void

  // ── Tool Slice ──
  activeTool: ToolType
  activeTileCode: string | null
  selection: Selection | null
  clipboard: string[][] | null
  setTool: (tool: ToolType) => void
  setActiveTile: (code: string) => void
  setSelection: (sel: Selection | null) => void
  copySelection: () => void
  paste: (x: number, y: number) => void

  // ── History Slice ──
  undoStack: Operation[]
  redoStack: Operation[]
  pushOperation: (op: Operation) => void
  undo: () => void
  redo: () => void

  // ── View Slice ──
  zoom: number
  panX: number
  panY: number
  showGrid: boolean
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  toggleGrid: () => void

  // ── File Handles ──
  mapFileHandle: FileSystemFileHandle | null
  registryFileHandle: FileSystemFileHandle | null
  setMapFileHandle: (h: FileSystemFileHandle | null) => void
  setRegistryFileHandle: (h: FileSystemFileHandle | null) => void

  // ── Entity Slice ──
  entities: Entity[]
  entityComments: string[]
  entityUnknownLines: string[]
  entitiesDirty: boolean
  selectedEntityId: string | null
  showEntities: boolean
  entitiesFileHandle: FileSystemFileHandle | null
  setEntitiesFileHandle: (h: FileSystemFileHandle | null) => void
  loadEntities: (entities: Entity[], comments: string[], unknownLines: string[]) => void
  clearEntities: () => void
  addEntity: (entity: Entity) => void
  updateEntity: (id: string, entity: Entity) => void
  deleteEntity: (id: string) => void
  moveEntity: (id: string, x: number, y: number) => void
  setSelectedEntity: (id: string | null) => void
  toggleShowEntities: () => void

  // ── Quick Paint ──
  onBeforePaint: (() => void) | null
  setOnBeforePaint: (cb: (() => void) | null) => void

  // ── Player Overlay ──
  playerOverlay: boolean
  playerOverlayPos: { x: number; y: number } | null
  setPlayerOverlay: (on: boolean) => void
  setPlayerOverlayPos: (pos: { x: number; y: number } | null) => void
}

export const useStore = create<TileForgeState>((set, get) => ({
  // ── Registry ──
  tiles: new Map(),
  registryDirty: false,

  addTile: (tile) =>
    set((s) => {
      const tiles = new Map(s.tiles)
      tiles.set(tile.code, tile)
      return { tiles, registryDirty: true }
    }),

  updateTile: (code, tile) =>
    set((s) => {
      const tiles = new Map(s.tiles)
      if (code !== tile.code) {
        tiles.delete(code)
        // Rename across map
        const cells = s.cells.map((row) =>
          row.map((c) => (c === code ? tile.code : c))
        )
        tiles.set(tile.code, tile)
        return { tiles, cells, registryDirty: true, mapDirty: true }
      }
      tiles.set(tile.code, tile)
      return { tiles, registryDirty: true }
    }),

  deleteTile: (code) =>
    set((s) => {
      const tiles = new Map(s.tiles)
      tiles.delete(code)
      return { tiles, registryDirty: true }
    }),

  loadRegistry: (tileList) =>
    set(() => {
      const tiles = new Map<string, TileDefinition>()
      for (const t of tileList) {
        tiles.set(t.code, t)
      }
      return { tiles, registryDirty: false }
    }),

  // ── Map ──
  mapWidth: 0,
  mapHeight: 0,
  cells: [],
  mapDirty: false,

  setCell: (x, y, code) =>
    set((s) => {
      if (y < 0 || y >= s.mapHeight || x < 0 || x >= s.mapWidth) return s
      const cells = s.cells.map((row, ry) =>
        ry === y ? row.map((c, cx) => (cx === x ? code : c)) : row
      )
      return { cells, mapDirty: true }
    }),

  setCellRange: (changes) =>
    set((s) => {
      const cells = s.cells.map((row) => [...row])
      for (const { x, y, code } of changes) {
        if (y >= 0 && y < s.mapHeight && x >= 0 && x < s.mapWidth) {
          cells[y][x] = code
        }
      }
      return { cells, mapDirty: true }
    }),

  loadMap: (cells, width, height) =>
    set(() => ({
      cells,
      mapWidth: width,
      mapHeight: height,
      mapDirty: false,
      undoStack: [],
      redoStack: [],
    })),

  clearMap: (width, height, fillCode) =>
    set(() => ({
      cells: Array.from({ length: height }, () =>
        Array.from({ length: width }, () => fillCode)
      ),
      mapWidth: width,
      mapHeight: height,
      mapDirty: false,
      undoStack: [],
      redoStack: [],
      entities: [],
      entityComments: [],
      entityUnknownLines: [],
      entitiesDirty: false,
      selectedEntityId: null,
      entitiesFileHandle: null,
    })),

  // ── Tool ──
  activeTool: 'paint',
  activeTileCode: null,
  selection: null,
  clipboard: null,

  setTool: (tool) => set({ activeTool: tool }),
  setActiveTile: (code) => set({ activeTileCode: code }),
  setSelection: (sel) => set({ selection: sel }),

  copySelection: () => {
    const { selection, cells } = get()
    if (!selection) return
    const { x, y, w, h } = selection
    const clip: string[][] = []
    for (let dy = 0; dy < h; dy++) {
      const row: string[] = []
      for (let dx = 0; dx < w; dx++) {
        row.push(cells[y + dy]?.[x + dx] ?? '..')
      }
      clip.push(row)
    }
    set({ clipboard: clip })
  },

  paste: (px, py) =>
    set((s) => {
      const { clipboard } = s
      if (!clipboard) return s
      const cells = s.cells.map((row) => [...row])
      const changes: Operation['changes'] = []
      for (let dy = 0; dy < clipboard.length; dy++) {
        for (let dx = 0; dx < clipboard[dy].length; dx++) {
          const x = px + dx
          const y = py + dy
          if (y >= 0 && y < s.mapHeight && x >= 0 && x < s.mapWidth) {
            const before = cells[y][x]
            const after = clipboard[dy][dx]
            cells[y][x] = after
            changes.push({ x, y, before, after })
          }
        }
      }
      return {
        cells,
        mapDirty: true,
        undoStack: [...s.undoStack, { description: 'Paste', changes }],
        redoStack: [],
      }
    }),

  // ── History ──
  undoStack: [],
  redoStack: [],

  pushOperation: (op) =>
    set((s) => ({
      undoStack: [...s.undoStack, op],
      redoStack: [],
    })),

  undo: () =>
    set((s) => {
      if (s.undoStack.length === 0) return s
      const undoStack = [...s.undoStack]
      const op = undoStack.pop()!
      const cells = s.cells.map((row) => [...row])
      for (const { x, y, before } of op.changes) {
        if (y >= 0 && y < s.mapHeight && x >= 0 && x < s.mapWidth) {
          cells[y][x] = before
        }
      }
      let entities = s.entities
      let entitiesDirty = s.entitiesDirty
      if (op.entityChanges && op.entityChanges.length > 0) {
        entities = [...entities]
        for (const ec of op.entityChanges) {
          if (ec.action === 'add' && ec.after) {
            entities = entities.filter((e) => e.id !== ec.after!.id)
          } else if (ec.action === 'delete' && ec.before) {
            entities.push(ec.before)
          } else if (ec.action === 'update' && ec.before) {
            entities = entities.map((e) => (e.id === ec.before!.id ? ec.before! : e))
          }
        }
        entitiesDirty = true
      }
      return {
        cells,
        entities,
        entitiesDirty,
        undoStack,
        redoStack: [...s.redoStack, op],
        mapDirty: op.changes.length > 0 ? true : s.mapDirty,
      }
    }),

  redo: () =>
    set((s) => {
      if (s.redoStack.length === 0) return s
      const redoStack = [...s.redoStack]
      const op = redoStack.pop()!
      const cells = s.cells.map((row) => [...row])
      for (const { x, y, after } of op.changes) {
        if (y >= 0 && y < s.mapHeight && x >= 0 && x < s.mapWidth) {
          cells[y][x] = after
        }
      }
      let entities = s.entities
      let entitiesDirty = s.entitiesDirty
      if (op.entityChanges && op.entityChanges.length > 0) {
        entities = [...entities]
        for (const ec of op.entityChanges) {
          if (ec.action === 'add' && ec.after) {
            entities.push(ec.after)
          } else if (ec.action === 'delete' && ec.after) {
            entities = entities.filter((e) => e.id !== ec.after!.id)
          } else if (ec.action === 'update' && ec.after) {
            entities = entities.map((e) => (e.id === ec.after!.id ? ec.after! : e))
          }
        }
        entitiesDirty = true
      }
      return {
        cells,
        entities,
        entitiesDirty,
        redoStack,
        undoStack: [...s.undoStack, op],
        mapDirty: op.changes.length > 0 ? true : s.mapDirty,
      }
    }),

  // ── View ──
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

  // ── File Handles ──
  mapFileHandle: null,
  registryFileHandle: null,
  setMapFileHandle: (h) => set({ mapFileHandle: h }),
  setRegistryFileHandle: (h) => set({ registryFileHandle: h }),

  // ── Entities ──
  entities: [],
  entityComments: [],
  entityUnknownLines: [],
  entitiesDirty: false,
  selectedEntityId: null,
  showEntities: true,
  entitiesFileHandle: null,
  setEntitiesFileHandle: (h) => set({ entitiesFileHandle: h }),

  loadEntities: (entities, comments, unknownLines) =>
    set(() => ({
      entities,
      entityComments: comments,
      entityUnknownLines: unknownLines,
      entitiesDirty: false,
      selectedEntityId: null,
    })),

  clearEntities: () =>
    set(() => ({
      entities: [],
      entityComments: [],
      entityUnknownLines: [],
      entitiesDirty: false,
      selectedEntityId: null,
      entitiesFileHandle: null,
    })),

  addEntity: (entity) =>
    set((s) => {
      const entities = [...s.entities, entity]
      const ec: EntityChange = { action: 'add', before: null, after: entity }
      return {
        entities,
        entitiesDirty: true,
        undoStack: [...s.undoStack, { description: `Add ${entity.type}`, changes: [], entityChanges: [ec] }],
        redoStack: [],
      }
    }),

  updateEntity: (id, entity) =>
    set((s) => {
      const before = s.entities.find((e) => e.id === id)
      if (!before) return s
      const entities = s.entities.map((e) => (e.id === id ? entity : e))
      const ec: EntityChange = { action: 'update', before, after: entity }
      return {
        entities,
        entitiesDirty: true,
        undoStack: [...s.undoStack, { description: `Update ${entity.type}`, changes: [], entityChanges: [ec] }],
        redoStack: [],
      }
    }),

  deleteEntity: (id) =>
    set((s) => {
      const before = s.entities.find((e) => e.id === id)
      if (!before) return s
      const entities = s.entities.filter((e) => e.id !== id)
      const ec: EntityChange = { action: 'delete', before, after: before }
      return {
        entities,
        entitiesDirty: true,
        selectedEntityId: s.selectedEntityId === id ? null : s.selectedEntityId,
        undoStack: [...s.undoStack, { description: `Delete ${before.type}`, changes: [], entityChanges: [ec] }],
        redoStack: [],
      }
    }),

  moveEntity: (id, x, y) =>
    set((s) => {
      const before = s.entities.find((e) => e.id === id)
      if (!before) return s
      const after = { ...before, x, y }
      const entities = s.entities.map((e) => (e.id === id ? after : e))
      const ec: EntityChange = { action: 'update', before, after }
      return {
        entities,
        entitiesDirty: true,
        undoStack: [...s.undoStack, { description: `Move ${before.type}`, changes: [], entityChanges: [ec] }],
        redoStack: [],
      }
    }),

  setSelectedEntity: (id) => set({ selectedEntityId: id }),
  toggleShowEntities: () => set((s) => ({ showEntities: !s.showEntities })),

  // ── Quick Paint ──
  onBeforePaint: null,
  setOnBeforePaint: (cb) => set({ onBeforePaint: cb }),

  // ── Player Overlay ──
  playerOverlay: false,
  playerOverlayPos: null,
  setPlayerOverlay: (on) => set({ playerOverlay: on, playerOverlayPos: on ? null : null }),
  setPlayerOverlayPos: (pos) => set({ playerOverlayPos: pos }),
}))
