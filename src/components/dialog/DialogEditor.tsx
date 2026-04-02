import { useStore } from '../../store'
import { DialogTreeList } from './DialogTreeList'
import { DialogNodeList } from './DialogNodeList'
import { DialogNodeEditor } from './DialogNodeEditor'

export function DialogEditor() {
  const trees = useStore((s) => s.dialogTrees)

  if (trees.length === 0) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center">
        <div className="text-sm font-mono" style={{ color: 'var(--text-dim)' }}>
          Open a dialog file from the File menu
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0">
      <DialogTreeList />
      <DialogNodeList />
      <DialogNodeEditor />
    </div>
  )
}
