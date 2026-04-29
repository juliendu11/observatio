import type { ApplicationService } from '@adonisjs/core/types'
import StreamingService from '#services/streaming_service'
import SystemMetricsService from '#services/system_metrics_service'
import SSEService from '#services/sse_service'
import MetricsSchedulerService from '#services/metrics_scheduler_service'
import SystemLogsService from '#services/system_logs_service'
import TelegramNotificationService from '#services/telegram_notification_service'
import RecordingPubSubService from '#services/recording_pubsub_service'
import Setting from '#models/setting'
import FFMPEGService from '#services/ffmpeg_service'

export default class WebProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.singleton(FFMPEGService, () => {
      return new FFMPEGService()
    })

    this.app.container.singleton(StreamingService, async (resolver) => {
      const logger = await resolver.make('logger')
      const ffmpegService = await resolver.make(FFMPEGService)

      return new StreamingService(logger, ffmpegService)
    })

    this.app.container.singleton(SystemMetricsService, () => {
      return new SystemMetricsService()
    })

    this.app.container.singleton(SSEService, () => {
      return new SSEService()
    })

    this.app.container.singleton(SystemLogsService, () => {
      return new SystemLogsService()
    })

    this.app.container.singleton(TelegramNotificationService, () => {
      return new TelegramNotificationService()
    })

    this.app.container.singleton(RecordingPubSubService, async (resolver) => {
      const redisService = await resolver.make('redis')
      return new RecordingPubSubService(redisService)
    })

    this.app.container.singleton(MetricsSchedulerService, async (resolver) => {
      const logger = await resolver.make('logger')
      const metricsService = await resolver.make(SystemMetricsService)
      const sseService = await resolver.make(SSEService)

      return new MetricsSchedulerService(metricsService, sseService, logger)
    })
  }

  /**
   * The container bindings have booted
   */
  async boot() {}

  /**
   * The application has been booted
   */
  async start() {
    const setting = await Setting.first()
    if (setting && setting.telegramBotToken && setting.telegramChatId) {
      const telegramNotificationService = await this.app.container.make(TelegramNotificationService)
      telegramNotificationService.install(setting.telegramBotToken, setting.telegramChatId)
    }

    const systemLogsService = await this.app.container.make(SystemLogsService)
    await systemLogsService.start()

    const metricsScheduler = await this.app.container.make(MetricsSchedulerService)
    metricsScheduler.start()
  }

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {
    const metricsScheduler = await this.app.container.make(MetricsSchedulerService)
    metricsScheduler.stop()

    const systemLogsService = await this.app.container.make(SystemLogsService)
    systemLogsService.stop()

    const recordingPubSub = await this.app.container.make(RecordingPubSubService)
    await recordingPubSub.disconnect()
  }
}
