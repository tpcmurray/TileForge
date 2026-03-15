# TileForge — ASCII Ascendant Tile Map Editor

## Technical Design Document

---

## 1. Overview

TileForge is a browser-based tile map editor purpose-built for ASCII Ascendant. It solves a specific problem: the visual feedback loop for tuning tile appearance (glyphs, colors, spatial composition) is unacceptably slow when the tile registry is hardcoded in C# and changes require recompilation. TileForge externalizes the tile registry into a shared data format consumed by both the editor and the game, and provides a real-time visual canvas for painting and previewing maps.

### Core Value Proposition

- **Fast iteration**: change a tile's glyph or color and see the result on the map instantly
- **Registry as data**: the tile registry moves out of C# and into a portable file that both TileForge and the game engine consume
- **Map authoring**: paint terrain maps using registry tiles, export as `.terrain` files

---

## 2. Concepts & Terminology

| Term | Definition |
|------|-----------|
| **Tile** | A registry entry: 2-char code, Code Page 437 glyph, foreground color (RGBA), background color (RGBA, supports transparent), and gameplay properties |
| **Cell** | A single position on the map grid, holding a reference to a tile via its 2-char code |
| **Map** | A rectangular grid of cells at a user-defined width × height (measured in cells) |
| **Registry** | The complete set of tile definitions, stored as a `.tileregistry` JSON file |
| **Terrain file** | The map output format — a plain text file where each cell is its tile's 2-char code, rows delimited by newlines |

---

## 3. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | React + TypeScript | Component model fits the tool palette / canvas / dialog pattern well; TypeScript catches tile code typos at dev time |
| Build | Vite | Fast HMR for the editor's own development cycle |
| Canvas | HTML5 Canvas (2D context) | The map grid needs per-cell rendering of CP437 glyphs with arbitrary fg/bg colors. DOM elements per cell won't scale; Canvas will |
| State | Zustand | Lightweight, no boilerplate. Stores: registry, current map, tool state, selection, undo stack |
| Styling | Tailwind CSS | Toolbar/dialog layout only — the map canvas is rendered programmatically |
| File I/O | Browser File API (open/save) | No server. Everything runs client-side. Files are opened via file picker and saved via download |
| CP437 Font | Custom bitmap font atlas (PNG) | A sprite sheet of all 256 CP437 glyphs rendered at a fixed cell size, drawn to canvas via `drawImage` with color tinting. This guarantees pixel-perfect CP437 rendering regardless of the user's installed fonts |

### No Server

TileForge is a fully client-side SPA. No backend, no database, no auth. Files are loaded from and saved to the local filesystem via the browser's File API.

---

## 4. Tile Registry Format (`.tileregistry`)

The registry file is the single source of truth shared between TileForge and the game. The game's `TileRegistry` static constructor will be replaced with a loader that reads this file at startup.

```json
{
  "version": 1,
  "tiles": [
    {
      "code": "..",
      "name": "Grass",
      "glyph": 183,
      "fg": { "r": 0, "g": 128, "b": 0, "a": 255 },
      "bg": { "r": 0, "g": 100, "b": 0, "a": 255 },
      "walkable": true,
      "transparent": true,
      "lightPass": true,
      "speedMod": 1.0,
      "lightRadius": 0
    },
    {
      "code": "##",
      "name": "Stone Wall",
      "glyph": 219,
      "fg": { "r": 128, "g": 128, "b": 128, "a": 255 },
      "bg": { "r": 169, "g": 169, "b": 169, "a": 255 },
      "walkable": false,
      "transparent": false,
      "lightPass": false,
      "speedMod": 1.0,
      "lightRadius": 0
    }
  ]
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` (exactly 2 chars) | The tile's identity in `.terrain` files. Must be unique across the registry |
| `name` | `string` | Human-readable label, displayed in the editor's tile palette |
| `glyph` | `number` (0–255) | Code Page 437 index |
| `fg` | `{ r, g, b, a }` | Foreground color, 0–255 per channel |
| `bg` | `{ r, g, b, a }` | Background color. `a: 0` = transparent |
| `walkable` | `boolean` | Gameplay: can entities traverse this tile |
| `transparent` | `boolean` | Gameplay: does this tile allow line-of-sight |
| `lightPass` | `boolean` | Gameplay: does light propagate through |
| `speedMod` | `number` | Gameplay: movement speed multiplier (1.0 = normal) |
| `lightRadius` | `number` | Gameplay: light emission radius (0 = none) |

### Design Decisions

- **Glyph as integer, not character**: CP437 index 183 is unambiguous. A Unicode character like `·` could be confused with similar-looking glyphs, and some CP437 characters (0–31) have no printable Unicode equivalent.
- **RGBA not hex**: the `a` channel is essential (transparent backgrounds). RGBA objects are also easier to work with in canvas rendering code than parsing hex+alpha strings.
- **Gameplay properties in the registry**: these don't affect the editor's rendering, but they're part of the tile definition. The editor exposes them in the tile editing dialog so you can tune everything in one place.

---

## 5. Terrain File Format (`.terrain`)

Unchanged from the existing format. A plain text file where each row is a sequence of 2-char tile codes with no delimiters:

```
trtctrtctrtctrtc
tctrtctrtctrtctr
tr..........trtc
tc....fl....tctc
```

### Parsing Rules

- Each line has exactly `width × 2` characters
- Each pair of characters is a tile code looked up against the loaded registry
- Lines are delimited by `\n` (LF) — no trailing newline required
- If a code is not found in the registry, the editor renders an error marker (bright magenta `?`) and preserves the code on save

---

## 6. Application Layout

```
┌──────────┬────────────────────────────────────────────┐
│ TOOLBAR  │                                            │
│          │                                            │
│ [Colors] │                                            │
│  FG: ██  │              MAP CANVAS                    │
│  BG: ██  │         (scrollable, zoomable)             │
│          │                                            │
│ [Char]   │                                            │
│  Current │                                            │
│  glyph   │                                            │
│          │                                            │
│ [Tile    │                                            │
│  Palette]│                                            │
│          │                                            │
│ [Tools]  │                                            │
│  Paint   │                                            │
│  Erase   │                                            │
│  Pick    │                                            │
│          ├────────────────────────────────────────────┤
│          │ STATUS BAR: cursor pos, tile under cursor  │
└──────────┴────────────────────────────────────────────┘
```

---

## 7. UI Components

### 7.1 Toolbar (Left Panel)

A fixed-width vertical panel containing the following sections, top to bottom:

#### Color Display & Picker

- Shows the **currently selected tile's** foreground and background colors as filled squares
- Clicking either square opens a color picker dialog (RGBA)
- Changing a color here **edits the registry entry** — it does not set a per-cell override
- The background color picker includes a "Transparent" toggle/button that sets `a: 0`

#### Character Selector

- Displays the current tile's CP437 glyph rendered large (preview)
- Clicking opens the **CP437 Character Dialog** (see 7.3)
- Selecting a character **edits the registry entry's glyph**

#### Tile Palette

- Scrollable grid showing all registered tiles rendered at actual appearance (glyph + fg + bg)
- Each tile shows its 2-char code below the visual
- Clicking a tile selects it as the active painting tile
- Double-clicking a tile opens the **Tile Editor Dialog** (see 7.4)
- A "+" button at the bottom to create a new tile
- Right-click context menu: Edit, Duplicate, Delete
- Search/filter bar at the top of the palette

#### Tool Selector

- **Paint** (default): click or click-drag to stamp the active tile onto map cells
- **Erase**: click or click-drag to clear cells (writes a configurable "empty" tile code, e.g., `..`)
- **Pick** (eyedropper): click a map cell to select its tile as the active tile

### 7.2 Map Canvas (Main Area)

- HTML5 Canvas element rendering the full map grid
- Each cell rendered as: background color fill → foreground glyph from the CP437 font atlas
- Cells with transparent backgrounds render a checkerboard pattern (Photoshop convention)
- Grid lines toggle (on by default, subtle)
- **Zoom**: mouse wheel or +/- keys. Minimum ~8px per cell, maximum ~64px per cell
- **Pan**: middle-click drag, or hold Space + left-click drag
- **Paint**: left-click or left-click-drag with Paint tool
- **Selection for copy/paste**: Shift+click-drag to define a rectangular selection, rendered with a marching-ants border
- **Copy**: Ctrl+C copies the selected region (stores an array of tile codes)
- **Paste**: Ctrl+V enters paste mode — a ghost preview follows the cursor, click to stamp
- **Undo/Redo**: Ctrl+Z / Ctrl+Shift+Z. Operation-based (each paint stroke, paste, or erase stroke is one undo unit)

### 7.3 CP437 Character Dialog

- Modal dialog showing all 256 Code Page 437 characters in a 16×16 grid
- Each character rendered from the font atlas
- Hovering shows the decimal index and character name in a tooltip
- Clicking a character selects it and closes the dialog
- Selecting a character updates the **active tile's registry entry**

### 7.4 Tile Editor Dialog

- Modal dialog for editing all properties of a tile
- Fields:
  - **Code** (2-char text input, validated for uniqueness)
  - **Name** (free text)
  - **Glyph** (shows current glyph, click to open CP437 dialog)
  - **Foreground color** (RGBA color picker)
  - **Background color** (RGBA color picker with transparency toggle)
  - **Walkable** (checkbox)
  - **Transparent** (checkbox)
  - **Light Pass** (checkbox)
  - **Speed Mod** (number input, default 1.0)
  - **Light Radius** (number input, default 0)
- **Live preview**: shows the tile rendered at a large size as you edit
- Save / Cancel buttons
- Changing a tile's code triggers a find-and-replace across the entire map (with confirmation)

### 7.5 Status Bar

- Bottom of the screen, single row
- Shows: cursor grid position (`x, y`), tile code under cursor, tile name under cursor
- Also shows current map dimensions and zoom level

---

## 8. File Operations

All file operations use the browser File API — no server round-trips.

| Operation | Trigger | Behavior |
|-----------|---------|----------|
| **New Map** | File menu / Ctrl+N | Prompts for width, height (in cells), and default fill tile. Creates a blank map |
| **Open Map** | File menu / Ctrl+O | Opens a `.terrain` file. Requires a registry to be loaded first (prompts if not) |
| **Save Map** | File menu / Ctrl+S | Downloads the map as a `.terrain` file |
| **Open Registry** | File menu | Opens a `.tileregistry` JSON file |
| **Save Registry** | File menu | Downloads the current registry as `.tileregistry` JSON |
| **Import C# Registry** | File menu | Parses the existing `TileRegistry.cs` static constructor and converts to `.tileregistry` format. One-time migration tool |
| **New Registry** | File menu | Creates an empty registry (you'd add tiles manually) |

### Unsaved Changes

The editor tracks dirty state for both the map and the registry independently. Attempting to close the tab, open a new file, or create new when there are unsaved changes triggers a browser confirmation dialog.

---

## 9. CP437 Font Atlas

The editor ships with a pre-rendered PNG sprite sheet of all 256 CP437 characters.

### Rendering Pipeline

1. At startup, load the font atlas PNG
2. Each glyph occupies a fixed-size cell in the atlas (e.g., 8×16 pixels for a classic DOS font)
3. To render a cell on the map canvas:
   - Fill the cell rect with the tile's background color (or checkerboard if transparent)
   - Draw the glyph from the atlas, tinted to the tile's foreground color
4. Foreground tinting approach: render the atlas glyph to an offscreen canvas, use `globalCompositeOperation = 'source-atop'` to fill with the foreground color, then composite onto the map canvas

### Atlas Source

Use an existing CP437 bitmap font (e.g., IBM VGA 8×16). The atlas will be a 128×256 PNG (16 columns × 16 rows of 8×16 cells). This file is committed to the repo and loaded as a static asset.

---

## 10. State Management

Zustand store, split into slices:

### Registry Slice
- `tiles: Map<string, TileDefinition>` — keyed by 2-char code
- `registryDirty: boolean`
- Actions: `addTile`, `updateTile`, `deleteTile`, `loadRegistry`, `importFromCSharp`

### Map Slice
- `width: number`, `height: number`
- `cells: string[][]` — 2D array of tile codes
- `mapDirty: boolean`
- Actions: `setCell`, `setCellRange`, `resize`, `loadMap`, `clear`

### Tool Slice
- `activeTool: 'paint' | 'erase' | 'pick'`
- `activeTileCode: string`
- `selection: { x, y, w, h } | null`
- `clipboard: string[][] | null`
- Actions: `setTool`, `setActiveTile`, `select`, `copy`, `paste`

### History Slice
- `undoStack: Operation[]`
- `redoStack: Operation[]`
- Actions: `push`, `undo`, `redo`
- An `Operation` stores the before/after state of affected cells (not full map snapshots)

### View Slice
- `zoom: number`
- `panX: number`, `panY: number`
- `showGrid: boolean`

---

## 11. C# Registry Importer

A one-time migration utility built into the editor. Parses the `Reg(...)` calls from the static constructor.

### Parsing Strategy

- Accept pasted C# source or an uploaded `.cs` file
- Regex-based extraction of `Reg(...)` calls
- Map `Color.X` named colors to RGB values (maintain a lookup table of .NET's named colors)
- Map `new Color(r, g, b)` to RGBA
- Map `'\uXXXX'` and `'c'` character literals to CP437 indices (requires a Unicode-to-CP437 mapping table)
- Handle optional parameters (`speedMod`, `lightRadius`) with defaults
- Output: a `.tileregistry` JSON that can be saved immediately

---

## 12. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New map |
| `Ctrl+O` | Open map |
| `Ctrl+S` | Save map |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` | Copy selection |
| `Ctrl+V` | Paste |
| `B` | Paint tool |
| `E` | Erase tool |
| `I` | Pick (eyedropper) tool |
| `G` | Toggle grid |
| `+` / `-` | Zoom in/out |
| `Space` + drag | Pan |
| `Escape` | Cancel paste mode / deselect |
| `Delete` | Clear selected cells to erase tile |

---

## 13. Project Structure

```
tileforge/
├── public/
│   └── cp437-8x16.png          # Font atlas
├── src/
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Layout shell
│   ├── store/
│   │   ├── registrySlice.ts
│   │   ├── mapSlice.ts
│   │   ├── toolSlice.ts
│   │   ├── historySlice.ts
│   │   ├── viewSlice.ts
│   │   └── index.ts             # Combined store
│   ├── components/
│   │   ├── Toolbar.tsx
│   │   ├── ColorPicker.tsx
│   │   ├── TilePalette.tsx
│   │   ├── TileEditor.tsx       # Edit dialog
│   │   ├── CP437Dialog.tsx
│   │   ├── MapCanvas.tsx        # Canvas rendering
│   │   ├── StatusBar.tsx
│   │   └── FileMenu.tsx
│   ├── rendering/
│   │   ├── atlas.ts             # Font atlas loader & glyph extraction
│   │   ├── renderer.ts          # Map canvas draw logic
│   │   └── tinting.ts           # Foreground color tinting via offscreen canvas
│   ├── io/
│   │   ├── terrainFile.ts       # .terrain read/write
│   │   ├── registryFile.ts      # .tileregistry read/write
│   │   └── csharpImporter.ts    # C# registry parser
│   ├── types/
│   │   └── index.ts             # TileDefinition, RGBA, Operation, etc.
│   └── utils/
│       ├── cp437.ts             # CP437 ↔ Unicode mapping tables
│       └── dotnetColors.ts      # .NET named color → RGB lookup
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 14. Implementation Phases

### Phase 1 — Foundation
- Project scaffold (Vite + React + TS + Tailwind + Zustand)
- CP437 font atlas loading and glyph rendering
- Type definitions for TileDefinition, RGBA, map grid
- Registry file format: load/save `.tileregistry` JSON
- C# registry importer (one-time migration)
- Basic canvas rendering: draw a grid of tiles from a loaded registry + map

### Phase 2 — Core Editing
- Toolbar with tile palette (select active tile)
- Paint tool (click and drag)
- Erase tool
- Pick tool (eyedropper)
- Zoom and pan
- Grid lines toggle
- Status bar

### Phase 3 — Registry Editing
- Tile editor dialog (all fields)
- CP437 character picker dialog
- Color pickers (RGBA) for fg/bg
- Live preview in tile editor
- Add / duplicate / delete tiles
- Code rename with map-wide find-and-replace

### Phase 4 — Copy/Paste & Polish
- Rectangular selection (shift+drag)
- Copy/paste with ghost preview
- Undo/redo system
- Unsaved changes protection
- New map dialog (dimensions + fill tile)
- Keyboard shortcuts
- Tile palette search/filter

---

## 15. Open Questions

1. **Cell size in the atlas**: 8×16 is classic DOS proportions (not square). Do you want square cells on the map (e.g., 8×8 or 16×16), or authentic tall DOS cells? Square cells are probably better for a top-down tile map.
2. **Registry categories**: the C# registry has comment-based groupings (Natural Terrain, Structural, etc.). Worth adding a `category` field to the registry format so the palette can group tiles?
3. **Multiple maps per session**: do you want tabs or just one map open at a time?
4. **Max map size**: any practical upper limit? A 200×200 map is 40,000 cells — canvas handles this fine. A 1000×1000 map (1M cells) might need virtualized rendering.
