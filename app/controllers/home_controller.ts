import type { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  async index({ response }: HttpContext) {
    return response.redirect().toRoute('cameras.index')
  }
}
