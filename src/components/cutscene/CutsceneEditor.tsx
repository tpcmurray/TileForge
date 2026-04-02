import { useStore } from '../../store'
import { CutsceneList } from './CutsceneList'
import { CutsceneStepList } from './CutsceneStepList'
import { CutsceneStepEditor } from './CutsceneStepEditor'

export function CutsceneEditor() {
  const cutscenes = useStore((s) => s.cutscenes)

  if (cutscenes.length === 0) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center">
        <div className="text-sm font-mono" style={{ color: 'var(--text-dim)' }}>
          Open a cutscene file from the File menu
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0">
      <CutsceneList />
      <CutsceneStepList />
      <CutsceneStepEditor />
    </div>
  )
}
