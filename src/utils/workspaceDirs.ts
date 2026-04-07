/**
 * Persist directory handles in IndexedDB so .entities files can be auto-loaded
 * as siblings of .terrain files. The File System Access API does not expose a
 * file's parent directory, so we maintain a list of "known" map folders that
 * the user has granted access to.
 */

const DB_NAME = 'tileforge-workspace'
const STORE_NAME = 'dirs'
const DB_VERSION = 1

export interface WorkspaceDirEntry {
  id?: number
  name: string
  handle: FileSystemDirectoryHandle
  timestamp: number
}

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

export async function getWorkspaceDirs(): Promise<WorkspaceDirEntry[]> {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).getAll()
      req.onsuccess = () => resolve((req.result as WorkspaceDirEntry[]).sort((a, b) => b.timestamp - a.timestamp))
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function addWorkspaceDir(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const existing = await getWorkspaceDirs()
    for (const e of existing) {
      try {
        if (await e.handle.isSameEntry(handle)) return
      } catch { /* ignore */ }
    }
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add({ name: handle.name, handle, timestamp: Date.now() })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* ignore */ }
}

export async function removeWorkspaceDir(id: number): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* ignore */ }
}

/**
 * Find a stored workspace directory that contains the given file handle.
 * Returns the directory handle if found and read-permission is available;
 * otherwise null. Does NOT prompt the user for permission.
 */
export async function findDirForFile(fileHandle: FileSystemFileHandle): Promise<FileSystemDirectoryHandle | null> {
  const dirs = await getWorkspaceDirs()
  for (const e of dirs) {
    try {
      const perm = await (e.handle as any).queryPermission?.({ mode: 'read' })
      if (perm && perm !== 'granted') continue
      const path = await e.handle.resolve(fileHandle)
      if (path) return e.handle
    } catch { /* ignore and try next */ }
  }
  return null
}
