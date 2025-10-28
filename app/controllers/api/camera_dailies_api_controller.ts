import { fileExists } from '#helpers/file_helper'
import app from '@adonisjs/core/services/app'
import HlsToMp4Job, { HlsToMp4Payload } from '#jobs/hls_to_mp4'
import SSEService from '#services/sse_service'
import { inject } from '@adonisjs/core'
import bull from '@acidiney/bull-queue/services/main'
import { HttpContext } from '@adonisjs/core/http'
import { HlsToMp4JobStatuses } from '#enums/HlsToMp4JobStatuses'
import Camera from '#models/camera'
import CameraPolicy from '#policies/camera_policy'
import ActionNotAllowedException from '#exceptions/action_not_allowed_exception'

@inject()
export default class CameraDailiesAPIController {
  constructor(protected sseService: SSEService) {}

  async download({ params, response, bouncer }: HttpContext) {
    const cameraId = +params.id
    const cameraDailyId = +params.dailyId

    const camera = await Camera.query().where('id', cameraId).firstOrFail()

    if (!(await bouncer.with(CameraPolicy).allows('view', camera))) {
      throw new ActionNotAllowedException()
    }

    const cameraDaily = await camera
      .related('dailies')
      .query()
      .where('id', cameraDailyId)
      .firstOrFail()

    if (cameraDaily.mp4Path) {
      const p = app.makePath('storage', cameraDaily.mp4Path)
      if (await fileExists(p)) {
        return response.download(p)
      }
    }

    const newJob = await bull.dispatch(HlsToMp4Job.name, {
      cameraId: camera.id,
      cameraDailyId: cameraDaily.id,
      day: cameraDaily.date,
    } as HlsToMp4Payload)

    cameraDaily.convertHlsToMp4JobId = newJob.id as string
    cameraDaily.convertHlsToMp4JobStatus = HlsToMp4JobStatuses.PENDING
    await cameraDaily.save()

    this.sseService.emitConvertHlsToMp4Status(cameraDaily)

    return response.noContent()
  }

  async cancelDownload({ params, response, bouncer }: HttpContext) {
    const cameraId = +params.id
    const cameraDailyId = +params.dailyId

    const camera = await Camera.query().where('id', cameraId).firstOrFail()

    if (!(await bouncer.with(CameraPolicy).allows('view', camera))) {
      throw new ActionNotAllowedException()
    }

    const cameraDaily = await camera
      .related('dailies')
      .query()
      .where('id', cameraDailyId)
      .firstOrFail()

    if (cameraDaily.convertHlsToMp4JobId) {
      cameraDaily.convertHlsToMp4JobStatus = HlsToMp4JobStatuses.STOPPED
      await cameraDaily.save()

      this.sseService.emitConvertHlsToMp4Status(cameraDaily)
    }

    return response.noContent()
  }
}
