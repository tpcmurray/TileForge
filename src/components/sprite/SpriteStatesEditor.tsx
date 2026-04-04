import { useCallback } from 'react'
import { useStore } from '../../store'
import { SpriteGridCanvas } from './SpriteGridCanvas'
import type { SpriteVisualData, SpriteCell } from '../../types/sprite'

export function SpriteStatesEditor({ npc }: { npc: SpriteVisualData }) {
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
  const copySpriteState = useStore((s) => s.copySpriteState)
  const expandGrid = useStore((s) => s.expandSpriteGrid)

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
        setSpriteCell('sprite', state, row, col, paintUpdate())
      },
      onCellPaint: (row: number, col: number) => {
        setSpriteCell('sprite', state, row, col, paintUpdate())
      },
      onCellRightClick: (_row: number, _col: number, cell: SpriteCell) => {
        if (paintMode === 'glyph') setCurrentGlyph(cell.glyph)
        else if (paintMode === 'fg') setCurrentFg(cell.fg)
        else setCurrentBg(cell.bg)
      },
    }),
    [setSelectedCell, setSpriteCell, paintUpdate, paintMode, setCurrentGlyph, setCurrentFg, setCurrentBg],
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-xs font-mono font-semibold" style={{ color: 'var(--text-bright)' }}>
          Sprite States
        </div>
        <div className="flex gap-0.5">
          {(['top', 'bottom', 'left', 'right'] as const).map((dir) => (
            <button
              key={dir}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-dim)',
              }}
              onClick={() => expandGrid(dir)}
              title={`Add blank ${dir === 'top' || dir === 'bottom' ? 'row' : 'column'} to ${dir}`}
            >
              {{ top: '\u2191', bottom: '\u2193', left: '\u2190', right: '\u2192' }[dir]}
            </button>
          ))}
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
              if (from && to) copySpriteState(from, to)
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
            <SpriteGridCanvas
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
