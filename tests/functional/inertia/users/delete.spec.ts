import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import sinon from 'sinon'
import RecordingPubSubService from '#services/recording_pubsub_service'
import app from '@adonisjs/core/services/app'

test.group('Inertia - users/delete', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(() => {
    const recordingPubSubServiceStub = sinon.createStubInstance(RecordingPubSubService)

    recordingPubSubServiceStub.publish.resolves()

    app.container.swap(RecordingPubSubService, () => recordingPubSubServiceStub)

    return () => {
      app.container.restoreAll()
    }
  })

  test('Should delete user when user is manager', async ({ client }) => {
    const defaultOrg = await Organization.firstOrFail()

    const mainUser = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const response = await client.delete(`/users/${user.id}`).loginAs(mainUser).withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'success',
      message: 'User deleted successfully',
    })
    response.assertInertiaComponent('users/index')
  })

  test('Should delete user when user is not manager but have permission', async ({ client }) => {
    const defaultOrg = await Organization.firstOrFail()

    const mainUser = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const deleteUserPerm = await Permission.findByOrFail('name', Permissions.ADD_USER)

    await mainUser.related('permissions').create({
      permissionId: deleteUserPerm.id,
    })

    const response = await client.delete(`/users/${user.id}`).loginAs(mainUser).withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'success',
      message: 'User deleted successfully',
    })
    response.assertInertiaComponent('users/index')
  })

  test('Should not delete user when user is not manager and not have permission', async ({
    client,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    const mainUser = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const response = await client.delete(`/users/${user.id}`).loginAs(mainUser).withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'error',
      message: 'Unauthorized action',
    })
    // Not have permission to show users list
    // response.assertInertiaComponent('users/index')
    response.assertInertiaComponent('cameras/index')
  })

  test('Should user not delete himself (manager)', async ({ client }) => {
    const defaultOrg = await Organization.firstOrFail()

    const mainUser = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    const response = await client.delete(`/users/${mainUser.id}`).loginAs(mainUser).withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'error',
      message: 'Unauthorized action',
    })
    response.assertInertiaComponent('users/index')
  })

  test('Should user not delete himself (user)', async ({ client }) => {
    const defaultOrg = await Organization.firstOrFail()

    const mainUser = await UserFactory.merge({
      organizationId: defaultOrg.id,
    }).create()

    const deleteUserPerm = await Permission.findByOrFail('name', Permissions.ADD_USER)

    await mainUser.related('permissions').create({
      permissionId: deleteUserPerm.id,
    })

    const response = await client.delete(`/users/${mainUser.id}`).loginAs(mainUser).withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'error',
      message: 'Unauthorized action',
    })
    response.assertInertiaComponent('users/index')
  })

  test('Should user not delete manager', async ({ client }) => {
    const defaultOrg = await Organization.firstOrFail()

    const manager = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const deleteUserPerm = await Permission.findByOrFail('name', Permissions.ADD_USER)

    await user.related('permissions').create({
      permissionId: deleteUserPerm.id,
    })

    const response = await client.delete(`/users/${manager.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'error',
      message: 'Unauthorized action',
    })
    response.assertInertiaComponent('users/index')
  })

  test('Should user not delete user from another org', async ({ client }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
    }).create()

    const org2 = await Organization.create({ name: 'Org2' })
    const userFromOtherOrg = await UserFactory.merge({
      organizationId: org2.id,
    }).create()

    const deleteUserPerm = await Permission.findByOrFail('name', Permissions.ADD_USER)

    await user.related('permissions').create({
      permissionId: deleteUserPerm.id,
    })

    const response = await client
      .delete(`/users/${userFromOtherOrg.id}`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'error',
      message: 'Unauthorized action',
    })
    response.assertInertiaComponent('users/index')
  })
})
