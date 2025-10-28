import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import hrTime from 'pretty-hrtime'
import Camera from '#models/camera'
import app from '@adonisjs/core/services/app'
import NotificationService from '#services/notification_service'

emitter.on('db:query', function (query) {
  if (query.duration) {
    logger.debug(`mysql: (${hrTime(query.duration)}) ${query.sql} - [${query.bindings}]`)
  } else {
    logger.debug(`mysql: ${query.sql} - [${query.bindings}]`)
  }
})

emitter.on('db:connection:error', function (err) {
  logger.error(err)
})

emitter.on('camera:status', async ({ camera, isAlive }) => {
  const notificationService = await app.container.make(NotificationService)

  await notificationService.sendCameraStatusNotification(camera, isAlive)
})

declare module '@adonisjs/core/types' {
  interface EventsList {
    'camera:status': { camera: Camera; isAlive: boolean }
  }
}
