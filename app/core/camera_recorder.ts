import Camera from '#models/camera'
import { ChildProcessWithoutNullStreams } from 'node:child_process'
import { join } from 'node:path'
import dayjs from 'dayjs'
import { Logger } from '@adonisjs/core/logger'
import CameraRecorderHealthChecker from '#core/camera_recorder_health_checker'
import CameraRecorderFileChecker from '#core/camera_recorder_file_checker'
import { createFolderIfNotExist } from '#helpers/file_helper'
import CameraDaily from '#models/camera_daily'
import FFMPEGService from '#services/ffmpeg_service'
import emitter from '@adonisjs/core/services/emitter'

const SEGMENT_FILE_DURATION_IN_SECONDS = 60

export type CameraRecorderConfig = {
  timer?: {
    beforeRestart?: {
      /**
       * In seconds
       */
      time: number
    }
  }
}

export default class CameraRecorder {
  private spawnOptions: string[] = []
  private camera: Camera
  private stream: ChildProcessWithoutNullStreams | null = null
  private restartResetTimer: NodeJS.Timeout | null = null
  private restartedCount = 0
  private dayChangeTimer: NodeJS.Timeout | null = null

  private readonly logger: Logger
  private healthChecker: CameraRecorderHealthChecker
  private fileChecker: CameraRecorderFileChecker
  private ffmpegService: FFMPEGService

  /**
   * In seconds
   * @private
   */
  private readonly SECONDS_BEFORE_RESTART: number = 5

  public blockRelaunch = false

  private _isAlive: boolean = false

  public aliveListener: ((isAlive: boolean) => void) | null = null

  public get isAlive(): boolean {
    return this._isAlive
  }

  public set isAlive(value: boolean) {
    this._isAlive = value

    emitter.emit('camera:status', {
      camera: this.camera,
      isAlive: value,
    })

    if (this.aliveListener) {
      this.aliveListener(this._isAlive)
    }
  }

  constructor(
    camera: Camera,
    ffmpegService: FFMPEGService,
    parentLogger: Logger,
    healthChecker: CameraRecorderHealthChecker,
    fileChecker: CameraRecorderFileChecker,
    config?: CameraRecorderConfig
  ) {
    this.camera = camera
    this.ffmpegService = ffmpegService

    if (config && config.timer && config.timer.beforeRestart) {
      this.SECONDS_BEFORE_RESTART = config.timer.beforeRestart.time
    }

    this.logger = parentLogger.child({
      name: `CameraRecorder:${camera.id}`,
      cameraId: camera.id,
      cameraName: camera.label,
      cameraLink: camera.link,
    })

    this.healthChecker = healthChecker
    this.fileChecker = fileChecker

    this.healthChecker.aliveListener = (isAlive) => {
      if (!isAlive) {
        this.logger.error({}, 'Health checker reported stream as not alive, restarting...')
        this.kill()
        this.restart()
      }
    }

    this.fileChecker.aliveListener = (isAlive) => {
      if (!isAlive) {
        this.logger.error({}, 'File checker reported stream as not alive, restarting...')
        this.kill()
        this.restart()
      }
    }
  }

  get currentDate() {
    return dayjs().format('YYYY-MM-DD')
  }

  get dayRecordingPath() {
    return join(this.camera.folder, this.currentDate)
  }

  private async run() {
    if (this.blockRelaunch) {
      this.logger.info('run >> Unable to launch because stream block relaunch = true')
      return
    }

    if (this.stream && this.stream.pid) {
      this.logger.info(
        {
          processPid: this.stream?.pid,
        },
        'run >> Unable to launch because stream already exist'
      )
      return
    }

    await createFolderIfNotExist(this.dayRecordingPath)

    await CameraDaily.firstOrCreate(
      {
        cameraId: this.camera.id,
        date: this.currentDate,
      },
      {
        cameraId: this.camera.id,
        date: this.currentDate,
        label: this.currentDate,
        path: `/cameras/${this.camera.id}/${this.currentDate}/stream.m3u8`,
      }
    )

    const instance = this.ffmpegService.recordRTSPToHLS(
      this.camera.link,
      this.camera.resolution,
      SEGMENT_FILE_DURATION_IN_SECONDS,
      this.dayRecordingPath,
      (err) => this.onStreamError(err),
      (data) => this.onStreamExit(data)
    )
    this.stream = instance.process
    this.spawnOptions = instance.args

    this.isAlive = true

    this.logger.info(
      { processPid: this.stream?.pid, options: this.spawnOptions.join(' ') },
      'RTSP record running'
    )

    this.healthChecker.start()
    this.fileChecker.start()
    this.scheduleDayChangeRestart()
  }

  private scheduleDayChangeRestart() {
    const now = dayjs()
    const midnight = now.add(1, 'day').startOf('day')
    const msUntilMidnight = midnight.diff(now)

    this.logger.info(
      { msUntilMidnight },
      `Day change restart scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`
    )

    this.dayChangeTimer = setTimeout(async () => {
      this.logger.info({}, 'Day changed, restarting recording for new day')
      this.kill()
      await this.run()
    }, msUntilMidnight)
  }

  async start() {
    await this.run()
  }

  private kill() {
    this.healthChecker.stop()
    this.fileChecker.stop()

    if (this.dayChangeTimer) {
      clearTimeout(this.dayChangeTimer)
      this.dayChangeTimer = null
    }

    if (this.stream) {
      this.logger.info(
        {
          processPid: this.stream?.pid,
        },
        'Stop RTSP record'
      )

      this.stream.kill()
      this.stream = null
    }

    this.isAlive = false
  }

  private async restart() {
    if (this.blockRelaunch) {
      this.logger.info({}, 'Restart blocked because blockRelaunch = true')
      return
    }

    if (this.restartResetTimer) {
      clearTimeout(this.restartResetTimer)
    }

    this.restartResetTimer = setTimeout(() => {
      this.logger.info({}, 'No error for 5s, reset restartedCount to 0')
      this.restartedCount = 0
    }, 5000)

    const secondsBeforeRestart = this.SECONDS_BEFORE_RESTART + this.restartedCount * 2

    this.logger.info({}, `Wait ${secondsBeforeRestart} seconds before restart`)

    await new Promise((resolve) => setTimeout(resolve, secondsBeforeRestart * 1000))

    this.logger.info({}, `Restart`)

    this.restartedCount++

    await this.run()
  }

  private onStreamExit(code: number | null) {
    this.logger.error({ code: code, processPid: this.stream?.pid }, 'RTSP stream exited with code')

    this.kill()
    this.restart()
  }

  private onStreamError(error: Error) {
    this.logger.error({ err: error, processPid: this.stream?.pid }, 'RTSP stream exited with error')

    this.kill()
    this.restart()
  }

  async stop() {
    if (this.stream) {
      this.logger.info({ processPid: this.stream?.pid }, 'Stopping process')

      this.blockRelaunch = false
      this.kill()
    }
  }

  simulateFailure() {
    this.kill()
  }
}
