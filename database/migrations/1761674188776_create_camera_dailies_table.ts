import { BaseSchema } from '@adonisjs/lucid/schema'
import { HlsToMp4JobStatuses } from '#enums/HlsToMp4JobStatuses'

export default class extends BaseSchema {
  protected tableName = 'camera_dailies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.string('label').notNullable()
      table.string('path').notNullable()
      table.string('date').notNullable()
      table.integer('camera_id').unsigned().references('cameras.id').onDelete('CASCADE')

      table.string('convert_hls_to_mp4_job_id').nullable()
      table.enum('convert_hls_to_mp4_job_status', Object.values(HlsToMp4JobStatuses)).nullable()
      table.string('mp4_path').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
