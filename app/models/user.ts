import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Camera from '#models/camera'
import Organization from '#models/organization'
import UserPermission from '#models/user_permission'
import CameraPermission from '#models/camera_permission'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare organizationId: number

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => UserPermission)
  declare permissions: HasMany<typeof UserPermission>

  @hasMany(() => CameraPermission)
  declare cameraPermissions: HasMany<typeof CameraPermission>

  @column({
    consume: (value) => {
      return Boolean(value)
    },
  })
  declare isManager: boolean

  @hasMany(() => Camera)
  declare cameras: HasMany<typeof Camera>

  @column()
  declare language: string

  @column()
  declare theme: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
