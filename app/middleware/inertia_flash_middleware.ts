import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class InertiaFlashMiddleware {
  async handle({ inertia, session }: HttpContext, next: NextFn) {
    inertia.share({
      flash: () => session.flashMessages.all(),
    })

    await next()
  }
}
