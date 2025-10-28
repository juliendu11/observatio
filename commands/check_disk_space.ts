import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import CheckDiskSpaceService from '#services/check_disk_space_service'

export default class CheckDiskSpace extends BaseCommand {
  static commandName = 'check:disk-space'
  static description = 'Check disk space and delete old records if necessary'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    await new CheckDiskSpaceService().execute()
  }
}
