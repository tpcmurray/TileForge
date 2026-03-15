# TileForge — Build Phases & Tasks

## How to Use This Document

Each task is a self-contained unit you can hand to your LLM as a prompt. They're ordered so each one builds on the last. The **Done When** criteria tell you when to stop fiddling and move on. Resist the urge to polish — get it working, then move forward. You can always circle back.

The TDD is the source of truth for specs. This document is the execution order.

---

## Phase 1 — Scaffold & Data Layer

The goal here is to get a running app that can load and save the registry and terrain files, with nothing visual yet beyond proof-of-life console output. This is the foundation everything else sits on.

### Task 1.1 — Project Scaffold

Set up the Vite + React + TypeScript + Tailwind + Zustand project. Wire up the basic app shell layout from the TDD (menubar, toolbar panel, canvas area, status bar) as empty placeholder divs with the correct CSS grid/flex structure. Dark theme CSS variables.

**Done when:** `npm run dev` shows the four-panel layout with placeholder text in each area, dark background, no errors in console.

---

### Task 1.2 — Type Definitions

Create all the TypeScript types from the TDD: `TileDefinition`, `RGBA`, `TerrainMap`, `Operation` (for undo), tool enums. Put them in `src/types/index.ts`. These are referenced by everything else so get them right.

**Done when:** Types compile cleanly. Import them from another file without errors.

---

### Task 1.3 — CP437 Mapping Tables

Build `src/utils/cp437.ts` with a complete bidirectional mapping between CP437 indices (0–255) and Unicode characters. This is a lookup table, not algorithmic — CP437 doesn't map cleanly to Unicode in the low range (0–31). Also include a `cp437Names` map for tooltip display (e.g., index 219 → "Full Block", index 183 → "Middle Dot").

**Done when:** You can call `cp437ToUnicode(219)` and get `'█'`, call `unicodeToCP437('█')` and get `219`, and `cp437Name(219)` returns `'Full Block'`. Test the weird ones: indices 0–31, 127, 255.

---

### Task 1.4 — .NET Named Color Lookup

Build `src/utils/dotnetColors.ts` — a map from .NET's named color strings (e.g., `"Color.Green"`, `"Color.SaddleBrown"`, `"Color.DodgerBlue"`) to RGBA values. You only need the colors actually used in the current registry plus a reasonable buffer of common ones. This is only used by the C# importer (Task 1.6) but it's cleaner as a standalone utility.

**Done when:** `dotnetColorToRGBA("Color.DarkGreen")` returns `{ r: 0, g: 100, b: 0, a: 255 }`.

---

### Task 1.5 — Registry File I/O

Build `src/io/registryFile.ts`. Two functions: `parseRegistry(json: string): TileDefinition[]` and `serializeRegistry(tiles: TileDefinition[]): string`. Validates on parse — checks for duplicate codes, validates code length is exactly 2, glyph index 0–255, RGBA channels 0–255. Returns errors, doesn't silently swallow them.

**Done when:** Round-trip test passes — serialize a registry, parse it back, deep-equal check. Validation catches a duplicate code and a glyph out of range.

---

### Task 1.6 — C# Registry Importer

Build `src/io/csharpImporter.ts`. Takes the raw C# source text (the static constructor contents), parses out all `Reg(...)` calls, and returns `TileDefinition[]`. Uses the .NET color lookup from Task 1.4. Handles both `Color.X` named colors and `new Color(r, g, b)` constructors. Handles `'\uXXXX'` and `'c'` character literals via the CP437 tables from Task 1.3. Handles optional named parameters (`speedMod:`, `lightRadius:`).

**Done when:** Feed it the actual `TileRegistry.cs` source from the game. It parses all entries without errors. Save the output as a `.tileregistry` file and manually spot-check 10 entries against the C# source.

---

### Task 1.7 — Terrain File I/O

Build `src/io/terrainFile.ts`. Two functions: `parseTerrain(text: string, width: number): string[][]` and `serializeTerrain(cells: string[][]): string`. The parser infers width from the first line (`line.length / 2`), so the width parameter might be optional — but validate that all lines have the same length. Flag unknown tile codes (codes not in the loaded registry) but preserve them.

**Done when:** Load the sample forest terrain from the TDD, serialize it back, diff is clean. Unknown codes are flagged but not lost.

---

### Task 1.8 — Zustand Store Setup

Create the Zustand store with all five slices from the TDD: registry, map, tool, history, view. Wire up the basic actions. The store doesn't need to be connected to any UI yet — just make sure the state shape is right and actions mutate correctly.

**Done when:** You can call `addTile`, `setCell`, `setTool`, `push` (undo), `undo`, `redo` from the browser console (expose store on `window` temporarily for testing) and the state updates correctly.

---

## Phase 2 — Canvas Rendering

The goal is to see tiles on screen. No editing yet — just read-only rendering of a loaded map.

### Task 2.1 — Font Atlas Loader

Build `src/rendering/atlas.ts`. Load the CP437 bitmap font PNG (8×16 or your chosen cell size), slice it into individual glyph images. Store them in memory so you can quickly grab glyph N as an ImageBitmap or offscreen canvas. The atlas is a 16×16 grid of glyphs.

You'll need to source or create the atlas PNG. An IBM VGA 8×16 bitmap font rendered to a sprite sheet works. If you want square cells for the map, use an 8×8 font or scale the 8×16 down. Decide this now.

**Done when:** You can call `getGlyph(219)` and get the full block character image. Render a few glyphs to a test canvas to visually confirm they look right.

---

### Task 2.2 — Map Canvas Renderer

Build `src/rendering/renderer.ts` and `src/rendering/tinting.ts`. Given the map state and registry from the store, render the full map to the HTML5 Canvas. For each cell: fill background color → draw foreground glyph tinted to foreground color. Transparent backgrounds render a checkerboard. Grid lines drawn on top (subtle, toggleable).

Wire this into `src/components/MapCanvas.tsx` — a React component that owns a `<canvas>` element and re-renders when the map or registry changes.

**Done when:** Load the sample forest terrain + imported registry. The map renders on the canvas and looks like your game's terrain. Grass is green, walls are solid blocks, campfires glow orange. You can toggle grid lines.

---

### Task 2.3 — Zoom & Pan

Add zoom (mouse wheel) and pan (middle-click drag or Space+drag) to the map canvas. Zoom scales the cell size between ~8px and ~64px. Pan offsets the canvas origin. The renderer needs to account for the viewport — only draw cells that are visible.

**Done when:** You can zoom in to see individual cell detail, zoom out to see the full map, and pan around. It's smooth, no jank. The cursor position in the status bar updates correctly relative to zoom/pan.

---

### Task 2.4 — Status Bar

Wire up `src/components/StatusBar.tsx`. Shows cursor grid position, tile code + name under cursor, map dimensions, zoom level. Reads from the store. Updates on mouse move over the canvas.

**Done when:** Move the mouse over the canvas and the status bar updates in real time with the correct cell coordinates and tile info.

---

## Phase 3 — Tile Palette & Selection

The goal is to be able to browse and select tiles from the registry. Still no map editing.

### Task 3.1 — Tile Palette Component

Build `src/components/TilePalette.tsx`. Scrollable grid of all registry tiles, each rendered with its actual appearance (glyph + fg on bg). Shows the 2-char code below each tile. Grouped by category if the registry has categories (consider adding an optional `category` field to the registry format now — it's cheap and the palette is much more usable with grouping). Search/filter bar at the top.

Click a tile to set it as the active tile in the store.

**Done when:** All registry tiles render in the palette with correct visual appearance. Clicking sets the active tile. Search filters by tile name and code. The active tile is visually highlighted.

---

### Task 3.2 — Tool Selector

Build the tool buttons in the toolbar: Paint, Erase, Pick. Clicking sets the active tool in the store. Keyboard shortcuts B, E, I. The active tool is visually highlighted.

**Done when:** You can switch tools via click and keyboard. The active tool is reflected in the store and visually indicated.

---

### Task 3.3 — Active Tile Display

Build the "Active Tile" section in the toolbar. Shows the currently selected tile's glyph rendered large with its colors, plus code and name. Also shows fg/bg color swatches. This is read-only for now — just reflects what's selected in the palette.

**Done when:** Selecting different tiles in the palette updates the active tile display immediately.

---

## Phase 4 — Map Editing

This is where it becomes a real tool.

### Task 4.1 — Paint Tool

Left-click on the canvas stamps the active tile's code into that cell. Left-click-drag paints continuously. The canvas re-renders affected cells immediately (don't redraw the whole map — just the dirty cells, or batch-redraw on requestAnimationFrame).

**Done when:** Select a tile, paint it onto the map, see it appear instantly. Drag-painting works smoothly with no visible lag.

---

### Task 4.2 — Erase Tool

Click or drag to set cells to a configurable "empty" tile code. Default to `..` (Grass) or whatever the user picked as the default fill when creating the map. Same interaction pattern as paint.

**Done when:** Erase tool clears cells to the default tile. Drag-erasing works.

---

### Task 4.3 — Pick Tool (Eyedropper)

Click a cell on the canvas to select its tile as the active tile. Automatically switches back to the Paint tool after picking.

**Done when:** Click a tree trunk cell, the active tile switches to `tr` Tree Trunk, tool switches back to Paint.

---

### Task 4.4 — Undo/Redo

Each paint stroke (mousedown → mousemove → mouseup) or erase stroke is one undo operation. Store the before/after state of affected cells only (not full map snapshots). Ctrl+Z undoes, Ctrl+Shift+Z redoes. The redo stack clears when a new operation is performed.

**Done when:** Paint some tiles, undo reverts the full stroke, redo re-applies it. Multiple undo/redo steps work correctly. New paint after undo clears the redo stack.

---

### Task 4.5 — File Operations (Map)

Wire up New Map (prompt for dimensions + fill tile), Open Map (file picker for `.terrain`), Save Map (download `.terrain`). Open requires a registry to be loaded first. Unsaved changes trigger a confirmation on New/Open/tab close.

**Done when:** Create a new map, paint on it, save it, close it, re-open it — the painted tiles are there. Unsaved changes warning works.

---

### Task 4.6 — File Operations (Registry)

Open Registry (file picker for `.tileregistry`), Save Registry (download), Import C# Registry (paste or upload `.cs` file, runs the importer, loads the result). New Registry creates an empty one.

**Done when:** Import the C# registry, save as `.tileregistry`, close, re-open — all tiles are there. The palette populates from the loaded registry.

---

## Phase 5 — Registry Editing

This is the fast feedback loop — the whole point of the tool.

### Task 5.1 — Tile Editor Dialog

Build `src/components/TileEditor.tsx`. Modal with all tile fields: code, name, glyph (click to open CP437 picker), fg color (RGBA picker), bg color (RGBA picker with transparent toggle), walkable, transparent, lightPass, speedMod, lightRadius. Live preview at the top showing the tile rendered with current settings.

Triggered by: double-click a palette tile, or click the active tile display, or right-click → Edit in the palette.

On save, the registry updates and the map canvas re-renders any cells using that tile code. If the code changed, prompt to rename across the map.

**Done when:** Open a tile, change its foreground color, hit save — every instance of that tile on the map updates instantly. Change a glyph — same. Rename a code — all map cells update.

---

### Task 5.2 — CP437 Character Picker Dialog

Build `src/components/CP437Dialog.tsx`. Modal with a 16×16 grid of all 256 CP437 characters (rendered from the font atlas or using the Unicode mapping). Hover shows index and name. Click selects and closes.

**Done when:** Opens from the tile editor's glyph field. Shows all 256 characters. Click selects the glyph and returns to the tile editor with the preview updated.

---

### Task 5.3 — Color Picker

Build `src/components/ColorPicker.tsx`. RGBA color picker. Doesn't need to be fancy — a hue/saturation square, a lightness slider, and an alpha slider. Plus direct RGBA number inputs for precise values. A "Transparent" button that sets alpha to 0.

This can also be triggered from the toolbar's fg/bg color swatches as a shortcut to editing the active tile's colors.

**Done when:** Pick a color, see the RGBA values update, see the tile preview update. Transparent toggle works. Direct number input works.

---

### Task 5.4 — Add / Duplicate / Delete Tiles

- **Add**: "+" button in palette opens the tile editor with blank defaults and an auto-generated unique code.
- **Duplicate**: right-click → Duplicate creates a copy with a modified code (e.g., `..` → `._`) and opens the editor.
- **Delete**: right-click → Delete, with confirmation. If the tile is used on the map, warn with a count of affected cells and ask what to replace them with.

**Done when:** All three operations work. Deleting a tile used on the map replaces those cells with the chosen replacement.

---

## Phase 6 — Copy/Paste & Final Polish

### Task 6.1 — Rectangular Selection

Shift+left-click-drag defines a rectangular selection on the map. Rendered with a dashed border (marching ants if you feel fancy, static dashed border if not). Escape or clicking outside deselects. The selection stores `{ x, y, w, h }` in the store.

**Done when:** Shift+drag selects a region. It's visually clear. Escape deselects.

---

### Task 6.2 — Copy & Paste

Ctrl+C copies the selected region's tile codes into the clipboard (a 2D string array in the store — not the system clipboard). Ctrl+V enters paste mode: a semi-transparent ghost of the copied region follows the cursor. Click to stamp it onto the map. Escape cancels paste mode. Pasting is a single undo operation.

**Done when:** Select a region, copy, paste it elsewhere on the map. The ghost preview is visible. Undo reverts the entire paste. Pasting near map edges clips correctly (doesn't crash or write out of bounds).

---

### Task 6.3 — Keyboard Shortcuts

Wire up all remaining shortcuts from the TDD that aren't already implemented: Ctrl+N, Ctrl+O, Ctrl+S, G (toggle grid), +/- (zoom), Delete (clear selection to erase tile). Make sure nothing conflicts with browser defaults (Ctrl+S especially needs `preventDefault`).

**Done when:** All shortcuts from the TDD work. Ctrl+S saves the map, doesn't trigger the browser's save dialog.

---

### Task 6.4 — Edge Cases & Hardening

This is a cleanup pass. Go through these scenarios and make sure nothing breaks:

- Open a terrain file with tile codes not in the registry → error markers render, codes preserved on save
- Resize the browser window → layout adapts, canvas re-renders correctly
- Zoom way in on a large map → only visible cells render (performance)
- Empty registry → palette shows nothing, paint tool is disabled
- Empty map (0×0) → graceful empty state
- Registry with 200+ tiles → palette scrolls, search is useful
- Very long tile names → don't break the palette layout
- Paint while zoomed/panned → correct cell targeting

**Done when:** None of the above scenarios crash or produce incorrect results.

---

## Phase Summary

| Phase | Tasks | What You Have After |
|-------|-------|-------------------|
| 1 — Scaffold & Data | 8 tasks | App shell, all file formats working, store wired up, C# registry imported |
| 2 — Canvas Rendering | 4 tasks | Map renders on screen with correct tile visuals, zoom/pan works |
| 3 — Palette & Selection | 3 tasks | Browse and select tiles from the registry |
| 4 — Map Editing | 6 tasks | Full paint/erase/pick workflow, file save/load, undo/redo |
| 5 — Registry Editing | 4 tasks | Edit tiles and see changes on the map instantly — the core feedback loop |
| 6 — Copy/Paste & Polish | 4 tasks | Selection, copy/paste, all shortcuts, hardened edge cases |

**Total: 29 tasks.** Each one is a focused vibe coding session — hand the task description + the TDD to your LLM and go.
