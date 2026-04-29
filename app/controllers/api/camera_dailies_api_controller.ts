import HlsToMp4Job, { HlsToMp4Payload } from '#jobs/hls_to_mp4'
import SSEService from '#services/sse_service'
import { inject } from '@adonisjs/core'
import bull from '@acidiney/bull-queue/services/main'
import { HttpContext } from '@adonisjs/core/http'
import { HlsToMp4JobStatuses } from '#enums/HlsToMp4JobStatuses'
import Camera from '#models/camera'
import CameraPolicy from '#policies/camera_policy'
import ActionNotAllowedException from '#exceptions/action_not_allowed_exception'
import app from '@adonisjs/core/services/app'
import { createReadStream, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileExists } from '#helpers/file_helper'

@inject()
export default class CameraDailiesAPIController {
  constructor(protected sseService: SSEService) {}

  async show({ params, response, bouncer, request }: HttpContext) {
    const cameraId = +params.id
    const urlParam: string = request.input('url')

    const absolutePath = app.makePath('storage', urlParam)

    const camera = await Camera.query().where('id', cameraId).firstOrFail()

    if (!(await bouncer.with(CameraPolicy).allows('view', camera))) {
      throw new ActionNotAllowedException()
    }

    const fileExist = await fileExists(absolutePath)
    if (!fileExist) {
      return response.notFound()
    }

    if (absolutePath.endsWith('.m3u8')) {
      response.type('application/vnd.apple.mpegurl')

      const segmentDir = dirname(urlParam)
      const raw = readFileSync(absolutePath, 'utf-8')
      const rewritten = raw
        .split('\n')
        .map((line) => {
          const trimmed = line.trim()
          if (trimmed === '' || trimmed.startsWith('#')) return line
          // rewrite each segment URI to go through our proxy endpoint
          const segmentUrl = `${segmentDir}/${trimmed}`
          return `/api/cameras/${cameraId}/medias?url=${segmentUrl}`
        })
        .join('\n')

      return response.send(rewritten)
    } else if (absolutePath.endsWith('.ts')) {
      response.type('video/mp2t')
    } else if (absolutePath.endsWith('.m4s')) {
      response.type('video/iso.segment')
    } else {
      return response.badRequest()
    }

    const stream = createReadStream(absolutePath)

    response.stream(stream)
  }

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
      return cameraDaily.mp4FileUrl
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
