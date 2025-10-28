import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import sinon from 'sinon'
import RecordingPubSubService from '#services/recording_pubsub_service'
import app from '@adonisjs/core/services/app'

test.group('Inertia - alerts/index', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(() => {
    const recordingPubSubServiceStub = sinon.createStubInstance(RecordingPubSubService)

    recordingPubSubServiceStub.publish.resolves()

    app.container.swap(RecordingPubSubService, () => recordingPubSubServiceStub)

    return () => {
      app.container.restoreAll()
    }
  })

  test('Should show page when user is a manager', async ({ client }) => {
    const defaultOrg = await Organization.firstOrFail()
    defaultOrg.related('setting').create({})

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    const response = await client.get('/alerts').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('alerts/index')
  })

  test('Should show page when user is a user is not manager and has correct permission', async ({
    client,
  }) => {
    const defaultOrg = await Organization.firstOrFail()
    defaultOrg.related('setting').create({})

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const permission = await Permission.findByOrFail({ name: Permissions.UPDATE_SETTINGS })

    user.related('permissions').create({ permissionId: permission.id })

    const response = await client.get('/alerts').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('alerts/index')
  })

  test('Should not show page with not allowed message when user is not manager and has not correct permission', async ({
    client,
  }) => {
    const defaultOrg = await Organization.firstOrFail()
    defaultOrg.related('setting').create({})

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const response = await client.get('/alerts').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('cameras/index')
    response.assertNotificationContains({
      type: 'error',
      message: 'Unauthorized action',
    })
  })
})
