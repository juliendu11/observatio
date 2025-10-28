import fs from 'node:fs/promises'

export const createFolderIfNotExist = async (path: string) => {
  try {
    await fs.stat(path)
  } catch {
    await fs.mkdir(path, { recursive: true })
  }
}

export const fileExists = async (path: string): Promise<boolean> => {
  try {
    await fs.stat(path)
    return true
  } catch {
    return false
  }
}

export const deleteFileIfExists = async (path: string) => {
  if (await fileExists(path)) {
    await fs.unlink(path)
  }
}
