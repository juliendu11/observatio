import { HttpContext } from '@adonisjs/core/http'
import { updateProfileValidator } from '#validators/profile'

export default class ProfileController {
  async update({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(updateProfileValidator)

    const user = auth.getUserOrFail()

    user.theme = payload.theme ?? user.theme
    user.language = payload.language ?? user.language

    await user.save()

    return response.redirect().back()
  }
}
