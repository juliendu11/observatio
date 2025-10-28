import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import sinon from 'sinon'
import RecordingPubSubService from '#services/recording_pubsub_service'
import app from '@adonisjs/core/services/app'

test.group('Inertia - cameras/create', (group) => {
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

    const response = await client.get(`/cameras/create`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('cameras/create')
  })

  test('Should show create form when user is not manager but have permission', async ({
    client,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const addCameraPerm = await Permission.findByOrFail('name', Permissions.ADD_CAMERA)

    await user.related('permissions').create({
      permissionId: addCameraPerm.id,
    })

    const response = await client.get(`/cameras/create`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('cameras/create')
  })

  test('Should not show create form when user is not manager and not have permission', async ({
    client,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const response = await client.get(`/cameras/create`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'error',
      message: 'Unauthorized action',
    })
    response.assertInertiaComponent('cameras/index')
  })
})
