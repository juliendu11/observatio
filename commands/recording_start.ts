import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { RecorderService } from '#services/recorder_service'
import { RECORDING_CHANNELS } from '#services/recording_pubsub_service'
import Camera from '#models/camera'
import { executeCommand } from '#helpers/command_helper'
import FFMPEGService from '#services/ffmpeg_service'

export default class RecordingStart extends BaseCommand {
  static commandName = 'recording:start'
  static description = 'Start the camera recording service'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const logger = await this.app.container.make('logger')
    const subscriber = await this.app.container.make('redis')
    const FFMPEGServiceInstance = await this.app.container.make(FFMPEGService)

    const currentLogger = logger.child({
      name: 'MetricsSchedulerService',
    })

    try {
      await executeCommand('killall ffmpeg')
    } catch (error) {
      currentLogger.info(error, 'Error killing existing ffmpeg processes on startup')
    }

    const recorderService = new RecorderService(logger, FFMPEGServiceInstance)
    await recorderService.start()

    subscriber.subscribe(RECORDING_CHANNELS.CAMERA_ADD, async (message) => {
      const data = JSON.parse(message) as { cameraId: number }

      const camera = await Camera.find(data.cameraId)
      if (camera) {
        await recorderService.add(camera)
      } else {
        currentLogger.debug(
          { camera: { id: data.cameraId } },
          'recording:camera:add — camera not found in DB'
        )
      }
    })

    subscriber.subscribe(RECORDING_CHANNELS.CAMERA_REMOVE, async (message) => {
      const data = JSON.parse(message) as { cameraId: number }
      await recorderService.removeById(data.cameraId)
    })

    currentLogger.info({}, 'Recording service started, listening for commands')

    const shutdown = async () => {
      currentLogger.info({}, 'Shutting down recording service...')
      await recorderService.stop()
      await subscriber.quit()
      process.exit(0)
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)

    await new Promise(() => {})
  }
}
