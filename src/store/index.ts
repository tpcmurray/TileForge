import { create } from 'zustand'
import type {
  TileDefinition,
  ToolType,
  Selection,
  Operation,
  Entity,
  EntityChange,
  RGBA,
} from '../types'
import type { SpriteVisualData, SpriteCell, SpriteState } from '../types/sprite'
import type { DialogTree, DialogNode } from '../types/dialog'
import type { Cutscene, CutsceneTrigger, CutsceneStep } from '../types/cutscene'

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

  // ── Editor Mode ──
  editorMode: 'map' | 'sprites' | 'dialogs' | 'cutscenes'
  setEditorMode: (mode: 'map' | 'sprites' | 'dialogs' | 'cutscenes') => void

  // ── NPC Slice ──
  sprites: SpriteVisualData[]
  selectedSpriteId: string | null
  spritesDirty: boolean
  spriteFileHandle: FileSystemFileHandle | null
  spriteSelectedCell: { target: string; row: number; col: number } | null
  spriteActiveState: string
  spritePaintMode: 'glyph' | 'fg' | 'bg'
  spriteCurrentGlyph: string
  spriteCurrentFg: RGBA
  spriteCurrentBg: RGBA
  setSpriteFileHandle: (h: FileSystemFileHandle | null) => void
  loadSprites: (sprites: SpriteVisualData[]) => void
  selectSprite: (id: string | null) => void
  setSpriteCell: (target: 'sprite' | 'portrait', state: string | null, row: number, col: number, cell: Partial<SpriteCell>) => void
  setSpritePaintMode: (mode: 'glyph' | 'fg' | 'bg') => void
  setSpriteCurrentGlyph: (ch: string) => void
  setSpriteCurrentFg: (c: RGBA) => void
  setSpriteCurrentBg: (c: RGBA) => void
  setSpriteSelectedCell: (pos: { target: string; row: number; col: number } | null) => void
  setSpriteActiveState: (s: string) => void
  copySpriteState: (from: string, to: string) => void
  expandSpriteGrid: (direction: 'top' | 'bottom' | 'left' | 'right') => void

  // ── Dialog Slice ──
  dialogTrees: DialogTree[]
  selectedTreeId: string | null
  selectedNodeId: string | null
  dialogsDirty: boolean
  dialogFileHandle: FileSystemFileHandle | null
  setDialogFileHandle: (h: FileSystemFileHandle | null) => void
  loadDialogs: (trees: DialogTree[]) => void
  selectDialogTree: (treeId: string | null) => void
  selectDialogNode: (nodeId: string | null) => void
  updateDialogNode: (treeId: string, nodeId: string, node: DialogNode) => void
  addDialogNode: (treeId: string, nodeId: string, node: DialogNode) => void
  deleteDialogNode: (treeId: string, nodeId: string) => void
  addDialogTree: (tree: DialogTree) => void
  deleteDialogTree: (treeId: string) => void
  updateDialogTreeId: (oldId: string, newId: string) => void
  updateDialogTreeRoot: (treeId: string, root: string) => void

  // ── Cutscene Slice ──
  cutscenes: Cutscene[]
  selectedCutsceneId: string | null
  selectedStepIndex: number | null
  cutscenesDirty: boolean
  cutsceneFileHandle: FileSystemFileHandle | null
  setCutsceneFileHandle: (h: FileSystemFileHandle | null) => void
  loadCutscenes: (cutscenes: Cutscene[]) => void
  selectCutscene: (id: string | null) => void
  selectStep: (index: number | null) => void
  updateStep: (cutsceneId: string, index: number, step: CutsceneStep) => void
  addStep: (cutsceneId: string, index: number, step: CutsceneStep) => void
  deleteStep: (cutsceneId: string, index: number) => void
  moveStep: (cutsceneId: string, from: number, to: number) => void
  addCutscene: (cutscene: Cutscene) => void
  deleteCutscene: (id: string) => void
  updateCutsceneTrigger: (id: string, trigger: CutsceneTrigger) => void
  updateCutsceneId: (oldId: string, newId: string) => void
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

  // ── Editor Mode ──
  editorMode: 'map',
  setEditorMode: (mode) => set({ editorMode: mode }),

  // ── NPC ──
  sprites: [],
  selectedSpriteId: null,
  spritesDirty: false,
  spriteFileHandle: null,
  spriteSelectedCell: null,
  spriteActiveState: 'idle',
  spritePaintMode: 'glyph',
  spriteCurrentGlyph: ' ',
  spriteCurrentFg: { r: 255, g: 255, b: 255, a: 255 },
  spriteCurrentBg: { r: 0, g: 0, b: 0, a: 0 },
  setSpriteFileHandle: (h) => set({ spriteFileHandle: h }),

  loadSprites: (items) =>
    set(() => ({
      sprites: items,
      selectedSpriteId: items.length > 0 ? items[0].id : null,
      spritesDirty: false,
      spriteSelectedCell: null,
    })),

  selectSprite: (id) => set({ selectedSpriteId: id, spriteSelectedCell: null }),

  setSpriteCell: (target, state, row, col, cellUpdate) =>
    set((s) => {
      const item = s.sprites.find((n) => n.id === s.selectedSpriteId)
      if (!item) return s

      const updateGrid = (grid: SpriteState) => {
        const newRows = grid.rows.map((r) => [...r])
        if (row < newRows.length && col < (newRows[row]?.length ?? 0)) {
          newRows[row][col] = { ...newRows[row][col], ...cellUpdate }
        }
        return { ...grid, rows: newRows }
      }

      let updated: SpriteVisualData
      if (target === 'sprite' && state) {
        const updatedSprite = { ...item.sprite }
        updatedSprite[state] = updateGrid(item.sprite[state])
        updated = { ...item, sprite: updatedSprite }
      } else if (target === 'portrait' && item.portrait) {
        updated = { ...item, portrait: updateGrid(item.portrait) }
      } else {
        return s
      }

      return {
        sprites: s.sprites.map((n) => (n.id === s.selectedSpriteId ? updated : n)),
        spritesDirty: true,
      }
    }),

  setSpritePaintMode: (mode) => set({ spritePaintMode: mode }),
  setSpriteCurrentGlyph: (ch) => set({ spriteCurrentGlyph: ch }),
  setSpriteCurrentFg: (c) => set({ spriteCurrentFg: c }),
  setSpriteCurrentBg: (c) => set({ spriteCurrentBg: c }),
  setSpriteSelectedCell: (pos) => set({ spriteSelectedCell: pos }),
  setSpriteActiveState: (s) => set({ spriteActiveState: s }),

  copySpriteState: (from, to) =>
    set((s) => {
      const item = s.sprites.find((n) => n.id === s.selectedSpriteId)
      if (!item) return s
      const source = item.sprite[from]
      const copy = {
        ...source,
        rows: source.rows.map((row) => row.map((cell) => ({ ...cell }))),
      }
      const updatedSprite = { ...item.sprite, [to]: copy }
      const updated = { ...item, sprite: updatedSprite }
      return {
        sprites: s.sprites.map((n) => (n.id === s.selectedSpriteId ? updated : n)),
        spritesDirty: true,
      }
    }),

  expandSpriteGrid: (direction) =>
    set((s) => {
      const item = s.sprites.find((n) => n.id === s.selectedSpriteId)
      if (!item) return s

      const blank: SpriteCell = { glyph: ' ', fg: { r: 255, g: 255, b: 255, a: 255 }, bg: { r: 0, g: 0, b: 0, a: 0 } }
      const updatedSprite: Record<string, SpriteState> = {}

      for (const [name, state] of Object.entries(item.sprite)) {
        let { rows, width, height } = state
        rows = rows.map((r) => [...r])

        switch (direction) {
          case 'top':
            rows = [Array.from({ length: width }, () => ({ ...blank })), ...rows]
            height += 1
            break
          case 'bottom':
            rows = [...rows, Array.from({ length: width }, () => ({ ...blank }))]
            height += 1
            break
          case 'left':
            rows = rows.map((r) => [{ ...blank }, ...r])
            width += 1
            break
          case 'right':
            rows = rows.map((r) => [...r, { ...blank }])
            width += 1
            break
        }
        updatedSprite[name] = { rows, width, height }
      }

      const updated = { ...item, sprite: updatedSprite }
      return {
        sprites: s.sprites.map((n) => (n.id === s.selectedSpriteId ? updated : n)),
        spritesDirty: true,
      }
    }),

  // ── Dialogs ──
  dialogTrees: [],
  selectedTreeId: null,
  selectedNodeId: null,
  dialogsDirty: false,
  dialogFileHandle: null,
  setDialogFileHandle: (h) => set({ dialogFileHandle: h }),

  loadDialogs: (trees) =>
    set(() => ({
      dialogTrees: trees,
      selectedTreeId: trees.length > 0 ? trees[0].tree_id : null,
      selectedNodeId: null,
      dialogsDirty: false,
    })),

  selectDialogTree: (treeId) => set({ selectedTreeId: treeId, selectedNodeId: null }),
  selectDialogNode: (nodeId) => set({ selectedNodeId: nodeId }),

  updateDialogNode: (treeId, nodeId, node) =>
    set((s) => {
      const dialogTrees = s.dialogTrees.map((t) => {
        if (t.tree_id !== treeId) return t
        const nodes = { ...t.nodes, [nodeId]: node }
        return { ...t, nodes }
      })
      return { dialogTrees, dialogsDirty: true }
    }),

  addDialogNode: (treeId, nodeId, node) =>
    set((s) => {
      const dialogTrees = s.dialogTrees.map((t) => {
        if (t.tree_id !== treeId) return t
        const nodes = { ...t.nodes, [nodeId]: node }
        return { ...t, nodes }
      })
      return { dialogTrees, dialogsDirty: true, selectedNodeId: nodeId }
    }),

  deleteDialogNode: (treeId, nodeId) =>
    set((s) => {
      const dialogTrees = s.dialogTrees.map((t) => {
        if (t.tree_id !== treeId) return t
        const nodes = { ...t.nodes }
        delete nodes[nodeId]
        return { ...t, nodes }
      })
      return {
        dialogTrees,
        dialogsDirty: true,
        selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
      }
    }),

  addDialogTree: (tree) =>
    set((s) => ({
      dialogTrees: [...s.dialogTrees, tree],
      selectedTreeId: tree.tree_id,
      selectedNodeId: null,
      dialogsDirty: true,
    })),

  deleteDialogTree: (treeId) =>
    set((s) => {
      const dialogTrees = s.dialogTrees.filter((t) => t.tree_id !== treeId)
      return {
        dialogTrees,
        dialogsDirty: true,
        selectedTreeId: s.selectedTreeId === treeId
          ? (dialogTrees.length > 0 ? dialogTrees[0].tree_id : null)
          : s.selectedTreeId,
        selectedNodeId: s.selectedTreeId === treeId ? null : s.selectedNodeId,
      }
    }),

  updateDialogTreeId: (oldId, newId) =>
    set((s) => {
      const dialogTrees = s.dialogTrees.map((t) =>
        t.tree_id === oldId ? { ...t, tree_id: newId } : t
      )
      return {
        dialogTrees,
        dialogsDirty: true,
        selectedTreeId: s.selectedTreeId === oldId ? newId : s.selectedTreeId,
      }
    }),

  updateDialogTreeRoot: (treeId, root) =>
    set((s) => {
      const dialogTrees = s.dialogTrees.map((t) =>
        t.tree_id === treeId ? { ...t, root } : t
      )
      return { dialogTrees, dialogsDirty: true }
    }),

  // ── Cutscenes ──
  cutscenes: [],
  selectedCutsceneId: null,
  selectedStepIndex: null,
  cutscenesDirty: false,
  cutsceneFileHandle: null,
  setCutsceneFileHandle: (h) => set({ cutsceneFileHandle: h }),

  loadCutscenes: (items) =>
    set(() => ({
      cutscenes: items,
      selectedCutsceneId: items.length > 0 ? items[0].id : null,
      selectedStepIndex: null,
      cutscenesDirty: false,
    })),

  selectCutscene: (id) => set({ selectedCutsceneId: id, selectedStepIndex: null }),
  selectStep: (index) => set({ selectedStepIndex: index }),

  updateStep: (cutsceneId, index, step) =>
    set((s) => {
      const cutscenes = s.cutscenes.map((cs) => {
        if (cs.id !== cutsceneId) return cs
        const steps = [...cs.steps]
        steps[index] = step
        return { ...cs, steps }
      })
      return { cutscenes, cutscenesDirty: true }
    }),

  addStep: (cutsceneId, index, step) =>
    set((s) => {
      const cutscenes = s.cutscenes.map((cs) => {
        if (cs.id !== cutsceneId) return cs
        const steps = [...cs.steps]
        steps.splice(index, 0, step)
        return { ...cs, steps }
      })
      return { cutscenes, cutscenesDirty: true, selectedStepIndex: index }
    }),

  deleteStep: (cutsceneId, index) =>
    set((s) => {
      const cutscenes = s.cutscenes.map((cs) => {
        if (cs.id !== cutsceneId) return cs
        const steps = cs.steps.filter((_, i) => i !== index)
        return { ...cs, steps }
      })
      return {
        cutscenes,
        cutscenesDirty: true,
        selectedStepIndex: s.selectedStepIndex === index ? null : s.selectedStepIndex,
      }
    }),

  moveStep: (cutsceneId, from, to) =>
    set((s) => {
      const cutscenes = s.cutscenes.map((cs) => {
        if (cs.id !== cutsceneId) return cs
        const steps = [...cs.steps]
        const [moved] = steps.splice(from, 1)
        steps.splice(to, 0, moved)
        return { ...cs, steps }
      })
      return { cutscenes, cutscenesDirty: true, selectedStepIndex: to }
    }),

  addCutscene: (cutscene) =>
    set((s) => ({
      cutscenes: [...s.cutscenes, cutscene],
      selectedCutsceneId: cutscene.id,
      selectedStepIndex: null,
      cutscenesDirty: true,
    })),

  deleteCutscene: (id) =>
    set((s) => {
      const cutscenes = s.cutscenes.filter((cs) => cs.id !== id)
      return {
        cutscenes,
        cutscenesDirty: true,
        selectedCutsceneId: s.selectedCutsceneId === id
          ? (cutscenes.length > 0 ? cutscenes[0].id : null)
          : s.selectedCutsceneId,
        selectedStepIndex: s.selectedCutsceneId === id ? null : s.selectedStepIndex,
      }
    }),

  updateCutsceneTrigger: (id, trigger) =>
    set((s) => {
      const cutscenes = s.cutscenes.map((cs) =>
        cs.id === id ? { ...cs, trigger } : cs
      )
      return { cutscenes, cutscenesDirty: true }
    }),

  updateCutsceneId: (oldId, newId) =>
    set((s) => {
      const cutscenes = s.cutscenes.map((cs) =>
        cs.id === oldId ? { ...cs, id: newId } : cs
      )
      return {
        cutscenes,
        cutscenesDirty: true,
        selectedCutsceneId: s.selectedCutsceneId === oldId ? newId : s.selectedCutsceneId,
      }
    }),
}))
