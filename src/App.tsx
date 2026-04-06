import { MenuBar } from './components/MenuBar'
import { TabBar } from './components/TabBar'
import { Toolbar } from './components/Toolbar'
import { MapCanvas } from './components/MapCanvas'
import { StatusBar } from './components/StatusBar'
import { SpriteEditor } from './components/sprite/SpriteEditor'
import { DialogEditor } from './components/dialog/DialogEditor'
import { CutsceneEditor } from './components/cutscene/CutsceneEditor'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useUnsavedChanges } from './hooks/useUnsavedChanges'
import { useStore } from './store'

function MapEditor() {
  return (
    <div className="flex flex-1 min-h-0">
      <Toolbar />
      <MapCanvas />
    </div>
  )
}

const MODE_EDITORS = {
  map: MapEditor,
  sprites: SpriteEditor,
  dialogs: DialogEditor,
  cutscenes: CutsceneEditor,
} as const

export default function App() {
  useKeyboardShortcuts()
  useUnsavedChanges()
  const editorMode = useStore((s) => s.editorMode)

  const Editor = MODE_EDITORS[editorMode]

  return (
    <>
      <MenuBar />
      <TabBar />
      <Editor />
      <StatusBar />
    </>
  )
}
