import { useCallback } from 'react'
import { useStore } from '../../store'
import { SpriteGridCanvas } from './SpriteGridCanvas'
import type { SpriteVisualData, SpriteCell } from '../../types/sprite'

export function SpritePortraitEditor({ npc }: { npc: SpriteVisualData }) {
  const selectedCell = useStore((s) => s.spriteSelectedCell)
  const setSelectedCell = useStore((s) => s.setSpriteSelectedCell)
  const paintMode = useStore((s) => s.spritePaintMode)
  const currentGlyph = useStore((s) => s.spriteCurrentGlyph)
  const currentFg = useStore((s) => s.spriteCurrentFg)
  const currentBg = useStore((s) => s.spriteCurrentBg)
  const setSpriteCell = useStore((s) => s.setSpriteCell)
  const setCurrentGlyph = useStore((s) => s.setSpriteCurrentGlyph)
  const setCurrentFg = useStore((s) => s.setSpriteCurrentFg)
  const setCurrentBg = useStore((s) => s.setSpriteCurrentBg)

  const paintUpdate = useCallback(() => {
    return paintMode === 'glyph'
      ? { glyph: currentGlyph }
      : paintMode === 'fg'
        ? { fg: currentFg }
        : { bg: currentBg }
  }, [paintMode, currentGlyph, currentFg, currentBg])

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      setSelectedCell({ target: 'portrait', row, col })
      setSpriteCell('portrait', null, row, col, paintUpdate())
    },
    [setSelectedCell, setSpriteCell, paintUpdate],
  )

  const handleCellPaint = useCallback(
    (row: number, col: number) => {
      setSpriteCell('portrait', null, row, col, paintUpdate())
    },
    [setSpriteCell, paintUpdate],
  )

  const handleRightClick = useCallback(
    (_row: number, _col: number, cell: SpriteCell) => {
      if (paintMode === 'glyph') setCurrentGlyph(cell.glyph)
      else if (paintMode === 'fg') setCurrentFg(cell.fg)
      else setCurrentBg(cell.bg)
    },
    [paintMode, setCurrentGlyph, setCurrentFg, setCurrentBg],
  )

  if (!npc.portrait) {
    return (
      <div className="mt-4">
        <div className="text-xs font-mono font-semibold mb-2" style={{ color: 'var(--text-bright)' }}>
          Portrait
        </div>
        <div className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
          No portrait defined
        </div>
      </div>
    )
  }

  const portrait = npc.portrait

  return (
    <div className="mt-4">
      <SpriteGridCanvas
        grid={portrait.rows}
        width={portrait.width}
        height={portrait.height}
        cellW={12}
        cellH={24}
        selectedCell={selectedCell?.target === 'portrait' ? selectedCell : null}
        onCellClick={handleCellClick}
        onCellPaint={handleCellPaint}
        onCellRightClick={handleRightClick}
        label="Portrait"
      />
    </div>
  )
}
