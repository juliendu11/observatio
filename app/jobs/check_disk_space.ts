import type { JobHandlerContract, Job } from '@acidiney/bull-queue/types'
import app from '@adonisjs/core/services/app'
import DiskSpaceCleanupService from '#services/disk_space_cleanup_service'

export type CheckDiskSpacePayload = {}

export default class CheckDiskSpace implements JobHandlerContract<CheckDiskSpacePayload> {
  /**
   * Base Entry point
   */
  async handle(_job: Job<CheckDiskSpacePayload>) {
    const diskSpaceCleanupService = await app.container.make(DiskSpaceCleanupService)
    await diskSpaceCleanupService.execute()
  }

  /**
   * This is an optional method that gets called if it exists when the retries has exceeded and is marked failed.
   */
  async failed(_job: Job<CheckDiskSpacePayload>) {}
}
