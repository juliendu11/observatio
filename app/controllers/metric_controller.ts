import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import SystemMetricsService from '#services/system_metrics_service'

@inject()
export default class MetricController {
  constructor(private metricsService: SystemMetricsService) {}

  async index({ inertia }: HttpContext) {
    const metrics = await this.metricsService.getMetrics()

    return inertia.render('metrics/index', {
      initialMetrics: metrics,
    })
  }
}
