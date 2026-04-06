import { useEffect } from 'react'
import { useStore } from '../store'

export function useUnsavedChanges() {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const { mapDirty, registryDirty, entitiesDirty, spritesDirty, dialogsDirty, cutscenesDirty, mapTabs } = useStore.getState()
      const bgTabDirty = mapTabs.some((t) => t.mapDirty || t.entitiesDirty)
      if (mapDirty || registryDirty || entitiesDirty || spritesDirty || dialogsDirty || cutscenesDirty || bgTabDirty) {
        e.preventDefault()
      }
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])
}
