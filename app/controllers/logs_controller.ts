import { HttpContext } from '@adonisjs/core/http'

export default class LogsController {
  async index({ inertia }: HttpContext) {
    return inertia.render('logs/index')
  }
}
