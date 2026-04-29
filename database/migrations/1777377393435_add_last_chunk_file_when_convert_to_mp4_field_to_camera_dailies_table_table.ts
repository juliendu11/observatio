import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'camera_dailies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('convert_hls_to_mp4_last_chunk').after('mp4_path').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('convert_hls_to_mp4_last_chunk')
    })
  }
}
