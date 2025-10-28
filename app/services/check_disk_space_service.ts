import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'
import CameraDaily from '#models/camera_daily'
import path from 'node:path'
import fs from 'node:fs/promises'
import checkDiskSpace from 'check-disk-space'

export default class CheckDiskSpaceService {
  async execute() {
    const MINIMUM_SPACE_GB = 5
    const MINIMUM_SPACE_BYTES = MINIMUM_SPACE_GB * 1024 * 1024 * 1024
    const RECORDS_TO_DELETE = 2

    const currentLogger = logger.child({
      name: `CheckDiskSpaceService`,
    })

    try {
      const diskPath = app.makePath()
      // @ts-ignore
      const diskSpace = await checkDiskSpace(diskPath)
      const availableSpaceGB = (diskSpace.free / (1024 * 1024 * 1024)).toFixed(2)

      if (diskSpace.free >= MINIMUM_SPACE_BYTES) {
        currentLogger.info(
          { current: { space: availableSpaceGB }, min: { space: MINIMUM_SPACE_GB } },
          `Sufficient disk space (${availableSpaceGB} GB >= ${MINIMUM_SPACE_GB} GB)`
        )
        return
      }

      currentLogger.info(
        {
          current: { space: availableSpaceGB },
          min: { space: MINIMUM_SPACE_GB },
          records: { toDelete: RECORDS_TO_DELETE },
        },
        `Insufficient disk space (${availableSpaceGB} GB < ${MINIMUM_SPACE_GB} GB)`
      )

      const oldestRecords = await CameraDaily.query()
        .orderBy('created_at', 'asc')
        .limit(RECORDS_TO_DELETE)

      if (oldestRecords.length === 0) {
        currentLogger.info({}, 'No records to delete')
        return
      }

      for (const record of oldestRecords) {
        currentLogger.debug(
          {
            record: {
              id: record.id,
              label: record.label,
            },
          },
          `Deleting the record`
        )

        if (record.path) {
          const folderPath = path.dirname(record.path)
          try {
            await fs.rm(folderPath, { recursive: true, force: true })

            currentLogger.debug(
              {
                record: {
                  id: record.id,
                  label: record.label,
                  folder: folderPath,
                },
              },
              `HLS Folder deleted`
            )
          } catch (error) {
            currentLogger.error(
              {
                record: {
                  id: record.id,
                  label: record.label,
                  folder: folderPath,
                },
              },
              JSON.stringify(error, null, 2)
            )
          }
        }

        if (record.mp4Path) {
          try {
            await fs.unlink(record.mp4Path)

            currentLogger.debug(
              {
                record: {
                  id: record.id,
                  label: record.label,
                  mp4: record.mp4Path,
                },
              },
              `MP4 File deleted`
            )
          } catch (error) {
            currentLogger.error(
              {
                record: {
                  id: record.id,
                  label: record.label,
                  mp4: record.mp4Path,
                },
              },
              JSON.stringify(error, null, 2)
            )
          }
        }

        await record.delete()

        currentLogger.debug(
          {
            record: {
              id: record.id,
              label: record.label,
            },
          },
          'Record deleted from the database'
        )
      }

      // @ts-ignore
      const newDiskSpace = await checkDiskSpace(diskPath)
      const newAvailableSpaceGB = (newDiskSpace.free / (1024 * 1024 * 1024)).toFixed(2)

      currentLogger.info(
        { current: { space: newAvailableSpaceGB }, min: { space: MINIMUM_SPACE_GB } },
        'Cleaning complete.'
      )
    } catch (error) {
      currentLogger.error(error)
    }
  }
}
