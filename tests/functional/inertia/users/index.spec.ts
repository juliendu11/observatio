import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import sinon from 'sinon'
import RecordingPubSubService from '#services/recording_pubsub_service'
import app from '@adonisjs/core/services/app'

test.group('Inertia - users/index', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(() => {
    const recordingPubSubServiceStub = sinon.createStubInstance(RecordingPubSubService)

    recordingPubSubServiceStub.publish.resolves()

    app.container.swap(RecordingPubSubService, () => recordingPubSubServiceStub)

    return () => {
      app.container.restoreAll()
    }
  })

  test('Should show users list when user is manager', async ({ client }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    const response = await client.get(`/users`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('users/index')
  })

  test('Should show users list when user is not manager but have permission', async ({
    client,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const perm = await Permission.findByOrFail('name', Permissions.ADD_USER)

    await user.related('permissions').create({
      permissionId: perm.id,
    })

    const response = await client.get(`/users/`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('users/index')
  })

  test('Should not show users list when user is not manager and not have permission', async ({
    client,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const response = await client.get(`/users`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'error',
      message: 'Unauthorized action',
    })
    response.assertInertiaComponent('cameras/index')
  })
})
