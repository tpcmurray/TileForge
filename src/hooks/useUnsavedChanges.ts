import { useEffect } from 'react'
import { useStore } from '../store'

export function useUnsavedChanges() {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const { mapDirty, registryDirty, entitiesDirty } = useStore.getState()
      if (mapDirty || registryDirty || entitiesDirty) {
        e.preventDefault()
      }
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])
}
