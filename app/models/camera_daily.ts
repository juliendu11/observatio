import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Camera from '#models/camera'
import type { HlsToMp4JobStatusesType } from '#enums/HlsToMp4JobStatuses'

export default class CameraDaily extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare cameraId: number

  @belongsTo(() => Camera)
  declare camera: BelongsTo<typeof Camera>

  @column()
  declare label: string

  @column()
  declare path: string

  @column()
  declare date: string

  @column({ columnName: 'convert_hls_to_mp4_job_id' })
  declare convertHlsToMp4JobId: string

  @column({ columnName: 'convert_hls_to_mp4_job_status' })
  declare convertHlsToMp4JobStatus: HlsToMp4JobStatusesType

  @column({ columnName: 'mp4_path' })
  declare mp4Path: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
