import { useCallback } from 'react'
import { useStore } from '../../store'
import { NpcGridEditor } from './NpcGridEditor'
import type { NpcVisualData, NpcCell } from '../../types/npc'

export function NpcSpriteEditor({ npc }: { npc: NpcVisualData }) {
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
  const copyNpcState = useStore((s) => s.copyNpcState)

  const stateNames = Object.keys(npc.sprite)

  const paintUpdate = useCallback(() => {
    return paintMode === 'glyph'
      ? { glyph: currentGlyph }
      : paintMode === 'fg'
        ? { fg: currentFg }
        : { bg: currentBg }
  }, [paintMode, currentGlyph, currentFg, currentBg])

  const makeHandlers = useCallback(
    (state: string) => ({
      onCellClick: (row: number, col: number) => {
        setSelectedCell({ target: state, row, col })
        setNpcCell('sprite', state, row, col, paintUpdate())
      },
      onCellPaint: (row: number, col: number) => {
        setNpcCell('sprite', state, row, col, paintUpdate())
      },
      onCellRightClick: (_row: number, _col: number, cell: NpcCell) => {
        if (paintMode === 'glyph') setCurrentGlyph(cell.glyph)
        else if (paintMode === 'fg') setCurrentFg(cell.fg)
        else setCurrentBg(cell.bg)
      },
    }),
    [setSelectedCell, setNpcCell, paintUpdate, paintMode, setCurrentGlyph, setCurrentFg, setCurrentBg],
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-xs font-mono font-semibold" style={{ color: 'var(--text-bright)' }}>
          Sprite States
        </div>
        {stateNames.length >= 2 && (
          <select
            className="text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-dim)',
              border: '1px solid var(--border)',
            }}
            onChange={(e) => {
              const [from, to] = e.target.value.split('→')
              if (from && to) copyNpcState(from, to)
              e.target.value = ''
            }}
            value=""
          >
            <option value="" disabled>Copy state…</option>
            {stateNames.map((from) =>
              stateNames
                .filter((to) => to !== from)
                .map((to) => (
                  <option key={`${from}→${to}`} value={`${from}→${to}`}>
                    {from} → {to}
                  </option>
                )),
            )}
          </select>
        )}
      </div>
      <div className="flex gap-4 flex-wrap">
        {stateNames.map((state) => {
          const grid = npc.sprite[state]
          const handlers = makeHandlers(state)
          return (
            <NpcGridEditor
              key={state}
              grid={grid.rows}
              width={grid.width}
              height={grid.height}
              selectedCell={selectedCell?.target === state ? selectedCell : null}
              onCellClick={handlers.onCellClick}
              onCellPaint={handlers.onCellPaint}
              onCellRightClick={handlers.onCellRightClick}
              label={state}
            />
          )
        })}
      </div>
    </div>
  )
}
