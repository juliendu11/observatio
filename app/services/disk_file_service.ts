import { readFile, stat, mkdir, rm, unlink } from 'node:fs/promises'

export default class DiskFileService {
  async readFile(path: string) {
    return await readFile(path, 'utf-8')
  }

  async createFolderIfNotExist(path: string) {
    try {
      await stat(path)
    } catch {
      await mkdir(path, { recursive: true })
    }
  }

  async checkFileExists(path: string) {
    try {
      await stat(path)
      return true
    } catch {
      return false
    }
  }

  async deleteFolderAndAllFiles(path: string) {
    await rm(path, { recursive: true, force: true })
  }

  async deleteFile(path: string) {
    await unlink(path)
  }
}
