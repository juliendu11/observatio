import type { HttpContext } from '@adonisjs/core/http'
import { loginValidator } from '#validators/login'
import User from '#models/user'

export default class SessionController {
  index({ inertia }: HttpContext) {
    return inertia.render('auth/login')
  }

  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(payload.email, payload.password)
    await auth.use('web').login(user)

    return response.redirect().toPath('/')
  }

  async destroy({ auth, response }: any) {
    await auth.use('web').logout()
    return response.redirect('/login')
  }
}
