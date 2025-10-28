import type { JobHandlerContract, Job } from '@acidiney/bull-queue/types'
import Camera from '#models/camera'
import app from '@adonisjs/core/services/app'
import { HlsToMp4JobStatuses } from '#enums/HlsToMp4JobStatuses'
import SSEService from '#services/sse_service'
import { createFolderIfNotExist } from '#helpers/file_helper'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

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

    const camera = await Camera.findOrFail(job.data.cameraId)
    const cameraDaily = await camera
      .related('dailies')
      .query()
      .where('id', job.data.cameraDailyId)
      .firstOrFail()

    const hlsStreamPath = app.makePath(camera.folder, job.data.day, 'stream.m3u8')

    const mp4Folfer = app.makePath(camera.folder, job.data.day, 'mp4')

    await createFolderIfNotExist(mp4Folfer)

    const mp4FIlePath = app.makePath(mp4Folfer, 'output.mp4')
    const hlsListPath = app.makePath(mp4Folfer, 'list.txt')
    const hlsListMergedPath = app.makePath(mp4Folfer, 'all.ts')

    const sh = promisify(exec)

    // 1) Générer list.txt avec ../ devant chaque ligne
    await sh(`grep -v '^#' ${hlsStreamPath} | sed "s|^|file '../|; s|$|'|" > ${hlsListPath}`)

    // 2) Concaténer les TS en un seul
    await sh(`ffmpeg -y -f concat -safe 0 -i ${hlsListPath} -c copy ${hlsListMergedPath}`, {
      maxBuffer: 10 * 1024 * 1024,
    })

    // 3) Remux en MP4
    await sh(
      `ffmpeg -y -i ${hlsListMergedPath} -c copy -bsf:a aac_adtstoasc -movflags +faststart ${mp4FIlePath}`,
      {
        maxBuffer: 10 * 1024 * 1024,
      }
    )

    cameraDaily.mp4Path = `/cameras/${camera.id}/${job.data.day}/mp4/output.mp4`
    cameraDaily.convertHlsToMp4JobStatus = HlsToMp4JobStatuses.DONE

    const path = app.makePath('storage', cameraDaily.mp4Path)
    cameraDaily.mp4Path = path

    sseService.emitConvertHlsToMp4Status(cameraDaily)

    await cameraDaily.save()
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
