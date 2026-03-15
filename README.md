# TileForge

A browser-based tile map editor built for **ASCII Ascendant**. TileForge externalizes the game's tile registry into a portable JSON format and provides a real-time visual canvas for painting and previewing terrain maps.

## Why

Tuning tile appearance (glyphs, colors, spatial composition) is painfully slow when the tile registry is hardcoded in C# and every change requires recompilation. TileForge gives you instant visual feedback — change a tile's glyph or color and see the result on the map immediately.

## Features

- **Tile Registry Editor** — define tiles with CP437 glyphs, RGBA foreground/background colors, and gameplay properties (walkable, transparent, light, speed)
- **Map Canvas** — paint terrain maps on a zoomable, pannable HTML5 Canvas with per-cell CP437 glyph rendering
- **Tools** — paint, erase, eyedropper, rectangular selection, copy/paste
- **File Formats** — `.tileregistry` (JSON) and `.terrain` (2-char tile codes, plain text)
- **C# Import** — one-time migration tool to convert the existing `TileRegistry.cs` into the new format
- **Fully Client-Side** — no server, no database, no auth. Everything runs in the browser.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React + TypeScript |
| Build | Vite |
| Canvas | HTML5 Canvas (2D) |
| State | Zustand |
| Styling | Tailwind CSS |
| File I/O | Browser File API |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
├── components/    # React UI components
├── store/         # Zustand state management
├── rendering/     # Canvas rendering (atlas, tinting)
├── io/            # File I/O (registry, terrain, C# importer)
├── types/         # TypeScript type definitions
└── utils/         # CP437 tables, .NET color lookup
```

## File Formats

### `.tileregistry` (JSON)

The tile registry — shared between TileForge and the game engine. Each tile has a 2-char code, CP437 glyph index, RGBA colors, and gameplay properties.

### `.terrain` (plain text)

Map files. Each row is a sequence of 2-char tile codes with no delimiters:

```
trtctrtctrtctrtc
tctrtctrtctrtctr
tr..........trtc
tc....fl....tctc
```

## Docs

See the [docs/](docs/) folder for the full technical design document, build phases, and UI wireframe.
