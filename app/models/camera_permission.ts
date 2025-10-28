import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Camera from '#models/camera'
import Permission from '#models/permission'

export default class CameraPermission extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column()
  declare cameraId: number

  @belongsTo(() => Camera)
  declare camera: BelongsTo<typeof Camera>

  @column()
  declare permissionId: number

  @belongsTo(() => Permission)
  declare permission: BelongsTo<typeof Permission>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
