import { useCallback, useState, useRef } from 'react'
import { useStore } from '../../store'
import { SpriteGridCanvas } from './SpriteGridCanvas'
import type { SpriteVisualData, SpriteCell, SpriteState } from '../../types/sprite'

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
  const expandGrid = useStore((s) => s.expandSpriteGrid)
  const addSpriteState = useStore((s) => s.addSpriteState)
  const renameSpriteState = useStore((s) => s.renameSpriteState)
  const pasteSpriteState = useStore((s) => s.pasteSpriteState)

  const [clipboard, setClipboard] = useState<SpriteState | null>(null)
  const [renamingState, setRenamingState] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

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

  const handleCopy = (state: string) => {
    const grid = npc.sprite[state]
    setClipboard({
      ...grid,
      rows: grid.rows.map((r) => r.map((c) => ({ ...c }))),
    })
  }

  const handlePaste = (state: string, mirror: boolean) => {
    if (!clipboard) return
    const src = mirror
      ? {
          ...clipboard,
          rows: clipboard.rows.map((r) => [...r].reverse()),
        }
      : clipboard
    pasteSpriteState(state, src)
  }

  const handleAddState = () => {
    const name = prompt('New state name:')
    if (name && name.trim() && !npc.sprite[name.trim()]) {
      addSpriteState(name.trim())
    }
  }

  const startRename = (state: string) => {
    setRenamingState(state)
    setRenameValue(state)
    setTimeout(() => renameRef.current?.select(), 0)
  }

  const commitRename = () => {
    if (renamingState && renameValue.trim() && renameValue.trim() !== renamingState) {
      renameSpriteState(renamingState, renameValue.trim())
    }
    setRenamingState(null)
  }

  const btnStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-dim)',
  }

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
              style={btnStyle}
              onClick={() => expandGrid(dir)}
              title={`Add blank ${dir === 'top' || dir === 'bottom' ? 'row' : 'column'} to ${dir}`}
            >
              {{ top: '\u2191', bottom: '\u2193', left: '\u2190', right: '\u2192' }[dir]}
            </button>
          ))}
        </div>
        <button
          className="text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer"
          style={btnStyle}
          onClick={handleAddState}
        >
          + State
        </button>
      </div>
      <div className="flex gap-4 flex-wrap">
        {stateNames.map((state) => {
          const grid = npc.sprite[state]
          const handlers = makeHandlers(state)
          return (
            <div key={state}>
              {/* Per-state toolbar: label + copy/paste buttons */}
              <div className="flex items-center gap-1 mb-1">
                {renamingState === state ? (
                  <input
                    ref={renameRef}
                    className="text-[10px] font-mono font-semibold uppercase tracking-wide px-1 py-0.5 rounded outline-none"
                    style={{
                      color: 'var(--accent)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--accent)',
                      width: 80,
                    }}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setRenamingState(null)
                    }}
                  />
                ) : (
                  <div
                    className="text-[10px] font-mono font-semibold uppercase tracking-wide cursor-pointer"
                    style={{ color: 'var(--accent)' }}
                    onDoubleClick={() => startRename(state)}
                    title="Double-click to rename"
                  >
                    {state}
                  </div>
                )}
                <div className="flex gap-0.5 ml-auto">
                  <button
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer"
                    style={btnStyle}
                    onClick={() => handleCopy(state)}
                    title="Copy this state"
                  >
                    Copy
                  </button>
                  <button
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer"
                    style={{
                      ...btnStyle,
                      opacity: clipboard ? 1 : 0.4,
                    }}
                    onClick={() => handlePaste(state, false)}
                    disabled={!clipboard}
                    title="Paste into this state"
                  >
                    Paste
                  </button>
                  <button
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer"
                    style={{
                      ...btnStyle,
                      opacity: clipboard ? 1 : 0.4,
                    }}
                    onClick={() => handlePaste(state, true)}
                    disabled={!clipboard}
                    title="Paste mirrored (horizontally flipped)"
                  >
                    Mirror
                  </button>
                </div>
              </div>
              <SpriteGridCanvas
                grid={grid.rows}
                width={grid.width}
                height={grid.height}
                selectedCell={selectedCell?.target === state ? selectedCell : null}
                onCellClick={handlers.onCellClick}
                onCellPaint={handlers.onCellPaint}
                onCellRightClick={handlers.onCellRightClick}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
