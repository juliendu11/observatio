import { HttpContext } from '@adonisjs/core/http'
import Camera from '#models/camera'
import { deleteFileIfExists } from '#helpers/file_helper'
import app from '@adonisjs/core/services/app'
import CameraPolicy from '#policies/camera_policy'

export default class CameraDailiesController {
  async destroy({ params, bouncer, response, session, i18n }: HttpContext) {
    const cameraId = +params.id
    const cameraDailyId = +params.dailyId

    const camera = await Camera.query().where('id', cameraId).first()

    if (!camera) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.camera_not_found'),
      })
      return response.redirect().back()
    }

    if (!(await bouncer.with(CameraPolicy).allows('view', camera))) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().back()
    }

    const cameraDaily = await camera.related('dailies').query().where('id', cameraDailyId).first()

    if (!cameraDaily) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.file_not_found'),
      })
      return response.redirect().back()
    }

    const path = app.makePath('storage', camera.folder, cameraDaily.date)
    await deleteFileIfExists(path)

    await cameraDaily.delete()

    return response.redirect().toRoute('cameras.show', { id: cameraId })
  }
}
