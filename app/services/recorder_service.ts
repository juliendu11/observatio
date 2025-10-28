import CameraRecorder from '#core/camera_recorder'
import Camera from '#models/camera'
import CameraRecorderHealthChecker from '#core/camera_recorder_health_checker'
import CameraRecorderFileChecker from '#core/camera_recorder_file_checker'
import { Logger } from '@adonisjs/core/logger'
import { inject } from '@adonisjs/core'
import env from '#start/env'
import emitter from '@adonisjs/core/services/emitter'

@inject()
export class RecorderService {
  recording: Map<string, CameraRecorder> = new Map()

  private readonly logger: Logger

  constructor(protected _logger: Logger) {
    this.logger = _logger.child({
      name: `RecorderService`,
    })
  }

  async start() {
    const cameras = await Camera.all()

    this.logger.info({ camera: { count: cameras.length } }, 'Start')

    for (const camera of cameras) {
      await this.add(camera)
    }
  }

  async add(camera: Camera) {
    if (this.recording.has(camera.id.toString())) {
      this.logger.debug({ camera: { id: camera.id } }, 'Recorder already exists for camera')
      return
    }

    const recorder = new CameraRecorder(
      camera,
      this.logger,
      new CameraRecorderHealthChecker(camera.link),
      new CameraRecorderFileChecker(camera.folder)
    )

    if (!env.get('BLOCK_RECORDING')) {
      recorder.aliveListener = (isAlive) => {
        emitter.emit('camera:status', {
          camera,
          isAlive,
        })
      }

      await recorder.start()
    }

    this.recording.set(camera.id.toString(), recorder)

    this.logger.info({ camera: { id: camera.id } }, 'Recorder started for camera')
  }

  async removeById(cameraId: number) {
    const recorder = this.recording.get(cameraId.toString())
    if (recorder) {
      recorder.aliveListener = null
      await recorder.stop()
      this.recording.delete(cameraId.toString())

      this.logger.debug({ camera: { id: cameraId } }, 'Recorder removed for camera')
    }
  }

  async stop() {
    this.logger.info({}, 'Stop all recorders')

    for (const recorder of this.recording.values()) {
      await recorder.stop()
    }
    this.recording.clear()
  }
}
