import Camera from '#models/camera'
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { join } from 'node:path'
import dayjs from 'dayjs'
import { Logger } from '@adonisjs/core/logger'
import CameraRecorderHealthChecker from '#core/camera_recorder_health_checker'
import CameraRecorderFileChecker from '#core/camera_recorder_file_checker'
import { createFolderIfNotExist } from '#helpers/file_helper'
import CameraDaily from '#models/camera_daily'

const SECONDS_BEFORE_RESTART = 5
const SEGMENT_FILE_DURATION_IN_SECONDS = 60

export default class CameraRecorder {
  private spawnOptions: string[] = []
  private camera: Camera
  private stream: ChildProcessWithoutNullStreams | null = null
  private restartResetTimer: NodeJS.Timeout | null = null
  private restartedCount = 0
  private dayChangeTimer: NodeJS.Timeout | null = null

  private logger: Logger
  private healthChecker: CameraRecorderHealthChecker
  private fileChecker: CameraRecorderFileChecker

  public blockRelaunch = false

  private _isAlive: boolean = false

  public aliveListener: ((isAlive: boolean) => void) | null = null

  public get isAlive(): boolean {
    return this._isAlive
  }

  public set isAlive(value: boolean) {
    this._isAlive = value

    if (this.aliveListener) {
      this.aliveListener(this._isAlive)
    }
  }

  constructor(
    camera: Camera,
    parentLogger: Logger,
    healthChecker: CameraRecorderHealthChecker,
    fileChecker: CameraRecorderFileChecker
  ) {
    this.camera = camera

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

    this.spawnOptions = [
      '-hide_banner',
      '-y',
      '-loglevel',
      'error',
      '-rtsp_transport',
      'tcp',
      // '-stimeout',
      '-timeout',
      '5000000',
      '-use_wallclock_as_timestamps',
      '1',
      '-i',
      this.camera.link,
      '-vf',
      `scale=${this.camera.resolution.replace('x', ':')}`,
      '-vcodec',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-r',
      '30',
      '-f',
      'hls',
      '-hls_time',
      SEGMENT_FILE_DURATION_IN_SECONDS.toString(),
      '-hls_list_size',
      '0',
      '-hls_segment_filename',
      `${this.dayRecordingPath}/segment_%03d.ts`,
      `${this.dayRecordingPath}/stream.m3u8`,
    ]

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

    this.stream = spawn('ffmpeg', this.spawnOptions, {
      detached: false,
    })

    this.isAlive = true

    this.logger.info(
      { processPid: this.stream?.pid, options: this.spawnOptions.join(' ') },
      'RTSP record running'
    )

    this.stream.on('exit', (code) => this.onStreamExit(code))
    this.stream.stdout.on('error', (chunk) => this.onStreamError(chunk))
    this.stream.stderr.on('error', (chunk) => this.onStreamError(chunk))
    this.stream.on('error', (error) => this.onStreamError(error))

    this.stream.stdout.on('data', () => {})
    this.stream.stderr.on('data', () => {})
    this.stream.on('disconnect', () => {})
    this.stream.on('close', () => {})

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

    const secondsBeforeRestart = SECONDS_BEFORE_RESTART + this.restartedCount * 2

    this.logger.info({}, `Wait ${secondsBeforeRestart} seconds before restart`)

    await new Promise((resolve) => setTimeout(resolve, secondsBeforeRestart * 1000))

    this.logger.info({}, `Restart`)

    this.restartedCount++

    this.run()
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
      this.logger.info({ processPid: this.stream?.pid }, 'stop >> Stop process')

      this.blockRelaunch = false
      this.kill()
    }
  }

  simulateFailure() {
    this.kill()
  }
}
