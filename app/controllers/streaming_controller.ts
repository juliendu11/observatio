import { WebSocketContext } from 'adonisjs-websocket'
import { inject } from '@adonisjs/core'
import StreamingService from '#services/streaming_service'
import CameraPolicy from '#policies/camera_policy'
import Camera from '#models/camera'

@inject()
export default class StreamingController {
  constructor(protected streamingService: StreamingService) {}

  async index({ ws, params, bouncer, auth, session, i18n }: WebSocketContext) {
    const cameraId = +params.id

    auth.getUserOrFail()

    const camera = await Camera.query().where('id', cameraId).first()

    if (!camera) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.camera_not_found'),
      })
      ws.close(404, 'Not found')
      return
    }

    if (!(await bouncer.with(CameraPolicy).allows('view', camera))) {
      ws.close(401, 'Unauthorized')
      return
    }

    const streamId = `camera_${cameraId}`

    await this.streamingService.newConnection(ws, streamId)
  }
}
