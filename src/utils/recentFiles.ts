/**
 * Persist recent file handles in IndexedDB so they survive page reloads.
 * FileSystemFileHandle is one of the few objects that can be stored in IDB.
 */

export interface RecentEntry {
  name: string
  kind: 'map' | 'registry' | 'sprite' | 'dialog' | 'cutscene'
  handle: FileSystemFileHandle
  timestamp: number
}

const DB_NAME = 'tileforge'
const STORE_NAME = 'recentFiles'
const DB_VERSION = 1
const MAX_RECENT = 8

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getRecentFiles(): Promise<RecentEntry[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => {
        const entries = (req.result as RecentEntry[])
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_RECENT)
        resolve(entries)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function addRecentFile(name: string, kind: RecentEntry['kind'], handle: FileSystemFileHandle): Promise<void> {
  try {
    const db = await openDB()

    // Remove existing entry with same name+kind to avoid duplicates
    const existing = await new Promise<{ id: number; name: string; kind: string }[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Delete duplicates (same name + kind)
    for (const entry of existing) {
      if (entry.name === name && entry.kind === kind) {
        store.delete(entry.id)
      }
    }

    // Add new entry
    store.add({ name, kind, handle, timestamp: Date.now() })

    // Trim to MAX_RECENT per kind
    const sorted = existing
      .filter((e) => e.kind === kind && e.name !== name)
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
    if (sorted.length >= MAX_RECENT - 1) {
      for (const old of sorted.slice(MAX_RECENT - 1)) {
        store.delete((old as any).id)
      }
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silently fail — recent files is a convenience feature
  }
}

export async function clearRecentFiles(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silently fail
  }
}
