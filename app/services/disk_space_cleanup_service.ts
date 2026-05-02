import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'
import CameraDaily from '#models/camera_daily'
import DiskSpaceService from '#services/disk_space_service'
import DiskFileService from '#services/disk_file_service'
import { inject } from '@adonisjs/core'

@inject()
export default class DiskSpaceCleanupService {
  constructor(
    protected diskFileService: DiskFileService,
    protected diskSpaceService: DiskSpaceService
  ) {}

  async execute() {
    const MINIMUM_SPACE_GB = 5
    const MINIMUM_SPACE_BYTES = MINIMUM_SPACE_GB * 1024 * 1024 * 1024
    const RECORDS_TO_DELETE = 2

    const currentLogger = logger.child({
      name: `DiskSpaceCleanupService`,
    })

    try {
      const diskPath = app.makePath()
      const diskSpace = await this.diskSpaceService.getDiskSpace(diskPath)
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

        if (record.folderPath) {
          try {
            await this.diskFileService.deleteFolderAndAllFiles(record.folderPath)

            currentLogger.debug(
              {
                record: {
                  id: record.id,
                  label: record.label,
                  folder: record.folderPath,
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
                  folder: record.folderPath,
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

      const newDiskSpace = await this.diskSpaceService.getDiskSpace(diskPath)
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
