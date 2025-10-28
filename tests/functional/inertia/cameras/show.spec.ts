import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import Camera from '#models/camera'
import sinon from 'sinon'
import RecordingPubSubService from '#services/recording_pubsub_service'
import app from '@adonisjs/core/services/app'

test.group('Inertia - cameras/show', (group) => {
  let recordingPubSubServiceStub: sinon.SinonStubbedInstance<RecordingPubSubService>

  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(() => {
    recordingPubSubServiceStub = sinon.createStubInstance(RecordingPubSubService)

    recordingPubSubServiceStub.publish.resolves()

    app.container.swap(RecordingPubSubService, () => recordingPubSubServiceStub)

    return () => {
      app.container.restoreAll()
    }
  })

  test('Should show create form when user is manager', async ({ client }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    const camera = await Camera.create({
      organizationId: defaultOrg.id,
      userId: user.id,
      label: 'Garage',
      link: 'FAKE_LINK',
    })

    const response = await client.get(`/cameras/${camera.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('cameras/show')
  })

  test('Should show create form when user is not manager but have permission', async ({
    client,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const camera = await Camera.create({
      organizationId: defaultOrg.id,
      userId: user.id,
      label: 'Garage',
      link: 'FAKE_LINK',
    })

    const addCameraPerm = await Permission.findByOrFail('name', Permissions.SHOW_CAMERA)

    await user.related('cameraPermissions').create({
      permissionId: addCameraPerm.id,
      cameraId: camera.id,
    })

    const response = await client.get(`/cameras/${camera.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('cameras/show')
  })

  test('Should not show create form when user is not manager and not have permission', async ({
    client,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const camera = await Camera.create({
      organizationId: defaultOrg.id,
      userId: user.id,
      label: 'Garage',
      link: 'FAKE_LINK',
    })

    const response = await client.get(`/cameras/${camera.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'error',
      message: 'Unauthorized action',
    })
    response.assertInertiaComponent('cameras/index')
  })
})
