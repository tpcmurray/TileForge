import { MenuBar } from './components/MenuBar'
import { Toolbar } from './components/Toolbar'
import { MapCanvas } from './components/MapCanvas'
import { StatusBar } from './components/StatusBar'
import { NpcEditor } from './components/npc/NpcEditor'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useUnsavedChanges } from './hooks/useUnsavedChanges'
import { useStore } from './store'

export default function App() {
  useKeyboardShortcuts()
  useUnsavedChanges()
  const editorMode = useStore((s) => s.editorMode)

  return (
    <>
      <MenuBar />
      {editorMode === 'map' ? (
        <div className="flex flex-1 min-h-0">
          <Toolbar />
          <MapCanvas />
        </div>
      ) : (
        <NpcEditor />
      )}
      <StatusBar />
    </>
  )
}
