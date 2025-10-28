import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs/promises'
import path from 'node:path'
import FileNotFoundException from '#exceptions/file_not_found_exception'
import FailedReadFileException from '#exceptions/failed_read_file_exception'
import FailedListFilesException from '#exceptions/failed_list_files_exception'
import AccessDeniedException from '#exceptions/access_denied_exception'
import InvalidFilenameException from '#exceptions/invalid_filename_exception'

export default class LogsAPIController {
  async listFiles({ response }: HttpContext) {
    try {
      const logsPath = app.makePath('logs')
      const files = await fs.readdir(logsPath)

      const logFiles = await Promise.all(
        files
          .filter((file) => file.endsWith('.log'))
          .map(async (file) => {
            const filePath = path.join(logsPath, file)
            const stats = await fs.stat(filePath)
            return {
              name: file,
              size: stats.size,
              modified: stats.mtime,
            }
          })
      )

      // Sort by modified date (most recent first)
      logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime())

      return response.json(logFiles)
    } catch (error) {
      throw new FailedListFilesException()
    }
  }

  async readFile({ params, response }: HttpContext) {
    try {
      const { filename } = params

      // Security: prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new InvalidFilenameException()
      }

      const logsPath = app.makePath('logs')
      const filePath = path.join(logsPath, filename)

      // Check if file exists and is within logs directory
      const realPath = await fs.realpath(filePath)
      if (!realPath.startsWith(await fs.realpath(logsPath))) {
        throw new AccessDeniedException()
      }

      const content = await fs.readFile(filePath, 'utf-8')

      return response.json({
        filename,
        content,
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileNotFoundException()
      }
      if (error instanceof InvalidFilenameException || error instanceof AccessDeniedException) {
        throw error
      }

      throw new FailedReadFileException()
    }
  }
}
