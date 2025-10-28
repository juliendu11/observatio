import type { HttpContext } from '@adonisjs/core/http'
import { createCameraValidator } from '#validators/camera'
import Camera from '#models/camera'
import RecordingPubSubService, { RECORDING_CHANNELS } from '#services/recording_pubsub_service'
import { inject } from '@adonisjs/core'
import CameraPolicy from '#policies/camera_policy'

@inject()
export default class CamerasController {
  constructor(protected recordingPubSub: RecordingPubSubService) {}

  async index({ inertia, bouncer }: HttpContext) {
    const cameras = await Camera.all()

    let camerasToShow: Camera[] = []

    for (const camera of cameras) {
      if (await bouncer.with(CameraPolicy).allows('view', camera)) {
        camerasToShow.push(camera)
      }
    }

    return inertia.render('cameras/index', {
      cameras: camerasToShow,
    })
  }

  async create({ inertia, bouncer, response, session, i18n }: HttpContext) {
    if (!(await bouncer.with(CameraPolicy).allows('add'))) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('cameras.index')
    }

    return inertia.render('cameras/create')
  }

  async show({ params, inertia, bouncer, response, session, i18n }: HttpContext) {
    const camera = await Camera.query()
      .where('id', params.id)
      .preload('dailies', (query) => {
        query.orderBy('date', 'desc').limit(30)
      })
      .first()

    if (!camera) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.camera_not_found'),
      })
      return response.redirect().toRoute('cameras.index')
    }

    if (!(await bouncer.with(CameraPolicy).allows('view', camera))) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('cameras.index')
    }

    return inertia.render('cameras/show', {
      camera,
    })
  }

  async store({ request, response, bouncer, auth, session, i18n }: HttpContext) {
    const payload = await request.validateUsing(createCameraValidator)

    const user = auth.getUserOrFail()

    if (!(await bouncer.with(CameraPolicy).allows('add'))) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('cameras.index')
    }

    const camera = await user.related('cameras').create({
      ...payload,
      organizationId: user.organizationId,
    })

    await this.recordingPubSub.publish(RECORDING_CHANNELS.CAMERA_ADD, { cameraId: camera.id })

    session.flash('notification', {
      type: 'success',
      message: i18n.t('messages.camera_added_success'),
    })

    return response.redirect().toRoute('cameras.index')
  }

  async destroy({ params, response, bouncer, session, i18n }: HttpContext) {
    const camera = await Camera.find(params.id)

    if (!camera) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.camera_not_found'),
      })

      return response.redirect().back()
    }

    if (!(await bouncer.with(CameraPolicy).allows('delete', camera))) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('cameras.index')
    }

    await camera.delete()

    await this.recordingPubSub.publish(RECORDING_CHANNELS.CAMERA_REMOVE, { cameraId: camera.id })

    session.flash('notification', {
      type: 'success',
      message: i18n.t('messages.camera_deleted_success'),
    })

    return response.redirect().toRoute('cameras.index')
  }
}
