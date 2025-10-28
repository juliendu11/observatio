import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import CameraDaily from '#models/camera_daily'
import app from '@adonisjs/core/services/app'
import Organization from '#models/organization'

export default class Camera extends BaseModel {
  get folder() {
    return app.makePath('storage', 'cameras', this.id.toString())
  }

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column()
  declare label: string

  @column()
  declare link: string

  @column()
  declare resolution: string

  @column()
  declare organizationId: number

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => CameraDaily)
  declare dailies: HasMany<typeof CameraDaily>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
