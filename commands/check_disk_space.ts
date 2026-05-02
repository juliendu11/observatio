import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import DiskSpaceCleanupService from '#services/disk_space_cleanup_service'

export default class CheckDiskSpace extends BaseCommand {
  static commandName = 'check:disk-space'
  static description = 'Check disk space and delete old records if necessary'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      const instance = await this.app.container.make(DiskSpaceCleanupService)

      await instance.execute()
    } catch (error) {
      console.error('Error during disk space cleanup:', error)
    }
  }
}
