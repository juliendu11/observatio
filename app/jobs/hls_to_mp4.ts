import type { JobHandlerContract, Job } from '@acidiney/bull-queue/types'
import Camera from '#models/camera'
import app from '@adonisjs/core/services/app'
import { HlsToMp4JobStatuses } from '#enums/HlsToMp4JobStatuses'
import SSEService from '#services/sse_service'
import { createFolderIfNotExist } from '#helpers/file_helper'
import { readFileSync } from 'node:fs'
import FFMPEGService from '#services/ffmpeg_service'

export type HlsToMp4Payload = {
  cameraId: number
  cameraDailyId: number
  /**
   * Format: YYYY-MM-DD
   */
  day: string
}

export default class HlsToMp4Job implements JobHandlerContract<HlsToMp4Payload> {
  /**
   * Base Entry point
   */
  async handle(job: Job<HlsToMp4Payload>) {
    const sseService = await app.container.make(SSEService)
    const fFMPEGService = await app.container.make(FFMPEGService)

    const camera = await Camera.findOrFail(job.data.cameraId)
    const cameraDaily = await camera
      .related('dailies')
      .query()
      .where('id', job.data.cameraDailyId)
      .firstOrFail()

    const hlsStreamPath = app.makePath(camera.folder, job.data.day, 'stream.m3u8')

    const m3u8Content = readFileSync(hlsStreamPath, 'utf-8')
    const lastChunk =
      m3u8Content
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'))
        .pop() ?? null

    const mp4Folfer = app.makePath(camera.folder, job.data.day, 'mp4')

    await createFolderIfNotExist(mp4Folfer)

    const mp4FIlePath = app.makePath(mp4Folfer, 'output.mp4')
    const hlsListPath = app.makePath(mp4Folfer, 'list.txt')
    const hlsListMergedPath = app.makePath(mp4Folfer, 'all.ts')

    await fFMPEGService.convertHLSToMp4(hlsStreamPath, hlsListPath, hlsListMergedPath, mp4FIlePath)

    cameraDaily.mp4Path = `/cameras/${camera.id}/${job.data.day}/mp4/output.mp4`
    cameraDaily.convertHlsToMp4JobStatus = HlsToMp4JobStatuses.DONE
    cameraDaily.convertHlsToMp4LastChunk = lastChunk as string
    await cameraDaily.save()

    sseService.emitConvertHlsToMp4Status(cameraDaily)
  }

  /**
   * This is an optional method that gets called if it exists when the retries has exceeded and is marked failed.
   */
  async failed(job: Job<HlsToMp4Payload>) {
    const sseService = await app.container.make(SSEService)
    const camera = await Camera.findOrFail(job.data.cameraId)
    const cameraDaily = await camera
      .related('dailies')
      .query()
      .where('id', job.data.cameraDailyId)
      .firstOrFail()

    cameraDaily.convertHlsToMp4JobStatus = HlsToMp4JobStatuses.ERROR

    sseService.emitConvertHlsToMp4Status(cameraDaily)

    await cameraDaily.save()
  }
}
