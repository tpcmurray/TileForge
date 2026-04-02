import { useCallback } from 'react'
import { useStore } from '../../store'
import { NpcGridEditor } from './NpcGridEditor'
import type { NpcVisualData, NpcCell } from '../../types/npc'

export function NpcPortraitEditor({ npc }: { npc: NpcVisualData }) {
  const selectedCell = useStore((s) => s.npcSelectedCell)
  const setSelectedCell = useStore((s) => s.setNpcSelectedCell)
  const paintMode = useStore((s) => s.npcPaintMode)
  const currentGlyph = useStore((s) => s.npcCurrentGlyph)
  const currentFg = useStore((s) => s.npcCurrentFg)
  const currentBg = useStore((s) => s.npcCurrentBg)
  const setNpcCell = useStore((s) => s.setNpcCell)
  const setCurrentGlyph = useStore((s) => s.setNpcCurrentGlyph)
  const setCurrentFg = useStore((s) => s.setNpcCurrentFg)
  const setCurrentBg = useStore((s) => s.setNpcCurrentBg)

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
      setNpcCell('portrait', null, row, col, paintUpdate())
    },
    [setSelectedCell, setNpcCell, paintUpdate],
  )

  const handleCellPaint = useCallback(
    (row: number, col: number) => {
      setNpcCell('portrait', null, row, col, paintUpdate())
    },
    [setNpcCell, paintUpdate],
  )

  const handleRightClick = useCallback(
    (_row: number, _col: number, cell: NpcCell) => {
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
      <NpcGridEditor
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
