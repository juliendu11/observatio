import SystemMetricsService from '#services/system_metrics_service'
import SSEService from '#services/sse_service'
import { Logger } from '@adonisjs/core/logger'
import { inject } from '@adonisjs/core'

@inject()
export default class MetricsSchedulerService {
  private interval: NodeJS.Timeout | null = null
  private isRunning = false
  private readonly UPDATE_INTERVAL_MS = 2 * 1000
  private currentLogger: Logger

  constructor(
    protected metricsService: SystemMetricsService,
    protected sseService: SSEService,
    protected parentLogger: Logger
  ) {
    this.currentLogger = parentLogger.child({
      name: 'MetricsSchedulerService',
    })
  }

  start() {
    if (this.isRunning) {
      this.currentLogger.debug({}, 'MetricsScheduler is already running')
      return
    }

    this.currentLogger.info({}, 'Starting MetricsScheduler')
    this.isRunning = true

    this.interval = setInterval(() => {
      this.sendMetrics()
    }, this.UPDATE_INTERVAL_MS)
  }

  stop() {
    if (!this.isRunning) {
      return
    }

    this.currentLogger.info({}, 'Stopping MetricsScheduler')

    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }

    this.isRunning = false
  }

  private async sendMetrics() {
    try {
      const metrics = await this.metricsService.getMetrics()
      this.sseService.emitSystemMetrics(metrics)
    } catch (error) {
      this.currentLogger.error(error, 'Error sending system metrics')
    }
  }
}
