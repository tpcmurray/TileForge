import { useStore } from '../store'
import { parseEntities } from '../io/entitiesFile'
import { findDirForFile, addWorkspaceDir } from './workspaceDirs'

/**
 * Try to auto-load the .entities file that sits next to a .terrain file.
 * Returns true on success. Does NOT prompt the user.
 */
export async function tryAutoLoadEntities(
  terrainHandle: FileSystemFileHandle,
  terrainName: string,
): Promise<boolean> {
  const dir = await findDirForFile(terrainHandle)
  if (!dir) return false
  return loadEntitiesFromDir(dir, terrainName)
}

/**
 * Same as tryAutoLoadEntities, but if no stored workspace directory contains
 * the terrain file, prompts the user once via showDirectoryPicker (positioned
 * at the terrain file's folder) to grant access. The granted directory is then
 * stored for future automatic use.
 */
export async function autoLoadEntitiesOrPromptForFolder(
  terrainHandle: FileSystemFileHandle,
  terrainName: string,
): Promise<boolean> {
  if (await tryAutoLoadEntities(terrainHandle, terrainName)) return true
  // Ask user to grant folder access so we can find the sibling.
  try {
    const dir: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({
      mode: 'read',
      startIn: terrainHandle,
    })
    // Confirm the picked directory actually contains the terrain file.
    const path = await dir.resolve(terrainHandle).catch(() => null)
    if (!path) return false
    await addWorkspaceDir(dir)
    return loadEntitiesFromDir(dir, terrainName)
  } catch {
    return false
  }
}

async function loadEntitiesFromDir(
  dir: FileSystemDirectoryHandle,
  terrainName: string,
): Promise<boolean> {
  const entitiesName = terrainName.replace(/\.terrain$/i, '.entities')
  if (entitiesName === terrainName) return false
  try {
    const eHandle = await dir.getFileHandle(entitiesName)
    const eFile = await eHandle.getFile()
    const eText = await eFile.text()
    const eResult = parseEntities(eText)
    if (eResult.errors.length > 0) console.warn('Entity parse warnings:', eResult.errors)
    useStore.getState().loadEntities(eResult.entities, eResult.comments, eResult.unknownLines)
    useStore.getState().setEntitiesFileHandle(eHandle)
    return true
  } catch {
    return false
  }
}
