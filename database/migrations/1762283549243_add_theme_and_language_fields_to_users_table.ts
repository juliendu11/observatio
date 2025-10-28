import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('theme', ['light', 'dark']).defaultTo('light').after('organization_id')
      table.enum('language', ['fr', 'en']).defaultTo('en').after('theme')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('theme')
      table.dropColumn('language')
    })
  }
}
