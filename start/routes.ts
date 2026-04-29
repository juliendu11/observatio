/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import transmit from '@adonisjs/transmit/services/main'

const SessionController = () => import('#controllers/session_controller')
const AlertsController = () => import('#controllers/alerts_controller')
const UsersController = () => import('#controllers/users_controller')
const CameraDailiesAPIController = () => import('#controllers/api/camera_dailies_api_controller')
const LogsAPIController = () => import('#controllers/api/logs_api_controller')
const LogsController = () => import('#controllers/logs_controller')
const MetricController = () => import('#controllers/metric_controller')
const CameraDailiesController = () => import('#controllers/camera_dailies_controller')
const CamerasController = () => import('#controllers/cameras_controller')
const HomeController = () => import('#controllers/home_controller')
const StreamingController = () => import('#controllers/streaming_controller')
const ProfileController = () => import('#controllers/profile_controller')

router.where('id', router.matchers.number())
router.where('dailyId', router.matchers.number())

transmit.registerRoutes((route) => {
  if (route.getPattern() === '__transmit/subscribe') {
    route.middleware([middleware.auth()])
  }
})

router.ws('/cameras/:id/streaming', [StreamingController, 'index'], [middleware.auth()])

router
  .group(() => {
    router.get('/cameras', [CamerasController, 'index']).as('cameras.index')
    router.get('/cameras/create', [CamerasController, 'create']).as('cameras.create')
    router.post('/cameras', [CamerasController, 'store']).as('cameras.store')
    router.delete('/cameras/:id', [CamerasController, 'destroy']).as('cameras.destroy')
    router.get('/cameras/:id', [CamerasController, 'show']).as('cameras.show')

    router
      .delete('/cameras/:id/dailies/:dailyId', [CameraDailiesController, 'destroy'])
      .as('camera.dailies.destroy')

    router.delete('/logout', [SessionController, 'destroy']).as('session.logout')

    router.get('/metrics', [MetricController, 'index']).as('metrics.index')

    router.get('/logs', [LogsController, 'index']).as('logs.index')

    router.get('/users', [UsersController, 'index']).as('users.index')
    router.post('/users', [UsersController, 'store']).as('users.store')
    router.delete('/users/:id', [UsersController, 'destroy']).as('users.destroy')

    router.patch('/profile', [ProfileController, 'update']).as('profile.update')

    router.get('/alerts', [AlertsController, 'index']).as('alerts.index')
    router.patch('/alerts', [AlertsController, 'update']).as('alerts.update')

    router.group(() => {
      router.get('/api/logs/files', [LogsAPIController, 'listFiles']).as('api.logs.files')
      router.get('/api/logs/files/:filename', [LogsAPIController, 'readFile']).as('api.logs.read')

      router
        .get('/api/cameras/:id/dailies/:dailyId', [CameraDailiesAPIController, 'download'])
        .as('api.camera.daily.download')

      router
        .get('/api/cameras/:id/medias', [CameraDailiesAPIController, 'show'])
        .as('api.camera.medias.show')

      router
        .delete('/api/cameras/:id/dailies/:dailyId', [CameraDailiesAPIController, 'cancelDownload'])
        .as('api.camera.daily.download.cancel')
    })
  })
  .use(middleware.auth())

router.get('/', [HomeController, 'index']).as('home')

router.get('/login', [SessionController, 'index']).as('session.index')
router.post('/login', [SessionController, 'store']).as('session.store')
