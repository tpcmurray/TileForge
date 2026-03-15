import { MenuBar } from './components/MenuBar'
import { Toolbar } from './components/Toolbar'
import { MapCanvas } from './components/MapCanvas'
import { StatusBar } from './components/StatusBar'

export default function App() {
  return (
    <>
      <MenuBar />
      <div className="flex flex-1 min-h-0">
        <Toolbar />
        <MapCanvas />
      </div>
      <StatusBar />
    </>
  )
}
