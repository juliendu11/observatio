import { HttpContext } from '@adonisjs/core/http'
import Setting from '#models/setting'
import SettingsPolicy from '#policies/settings_policy'
import { updateAlertValidator } from '#validators/alert'

export default class AlertsController {
  async index({ auth, inertia, bouncer, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()

    if (!(await bouncer.with(SettingsPolicy).allows('view'))) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('cameras.index')
    }

    const setting = await Setting.query().where('organization_id', user.organizationId).first()

    if (!setting) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.settings_not_found'),
      })
      return response.redirect().back()
    }

    return inertia.render('alerts/index', {
      telegram: {
        telegramBotToken: setting.telegramBotToken || null,
        telegramChatId: setting.telegramChatId || null,
      },
    })
  }

  async store({ auth, request, bouncer, response, session, i18n }: HttpContext) {
    const payload = await request.validateUsing(updateAlertValidator)
    const user = auth.getUserOrFail()

    if (!(await bouncer.with(SettingsPolicy).allows('add'))) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('cameras.index')
    }

    let setting = await Setting.query().where('organization_id', user.organizationId).first()

    if (!setting) {
      setting = await Setting.create({
        organizationId: user.organizationId,
        ...payload,
      })
    } else {
      setting.merge(payload)
      await setting.save()
    }

    session.flash('notification', {
      type: 'success',
      message: i18n.t('messages.settings_updated_success'),
    })

    return response.redirect().toRoute('alerts.index')
  }

  async update({ auth, request, bouncer, response, i18n, session }: HttpContext) {
    const payload = await request.validateUsing(updateAlertValidator)
    const user = auth.getUserOrFail()

    if (!(await bouncer.with(SettingsPolicy).allows('edit'))) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('cameras.index')
    }

    let setting = await Setting.query().where('organization_id', user.organizationId).first()

    if (!setting) {
      setting = await Setting.create({
        organizationId: user.organizationId,
        ...payload,
      })
    } else {
      setting.merge(payload)
      await setting.save()
    }

    session.flash('notification', {
      type: 'success',
      message: i18n.t('messages.settings_updated_success'),
    })

    return response.redirect().toRoute('alerts.index')
  }
}
