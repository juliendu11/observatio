import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import User from '#models/user'
import Camera from '#models/camera'
import sinon from 'sinon'
import RecordingPubSubService from '#services/recording_pubsub_service'
import app from '@adonisjs/core/services/app'

test.group('Inertia - users/store', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(() => {
    const recordingPubSubServiceStub = sinon.createStubInstance(RecordingPubSubService)

    recordingPubSubServiceStub.publish.resolves()

    app.container.swap(RecordingPubSubService, () => recordingPubSubServiceStub)

    return () => {
      app.container.restoreAll()
    }
  })

  test('Should add new user when user is manager', async ({ client, assert }) => {
    const defaultOrg = await Organization.firstOrFail()

    const mainUser = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    const camera = await Camera.create({
      label: 'Test',
      resolution: '640*800',
      link: 'rts//test.a',
      organizationId: defaultOrg.id,
    })

    const response = await client
      .post(`/users`)
      .loginAs(mainUser)
      .json({
        email: 'test@test.com',
        password: '123456789',
        canAddCamera: true,
        canAddUser: true,
        canUpdateSettings: true,
        cameraPermissions: [
          {
            cameraId: camera.id,
            canShow: true,
            canEdit: true,
            canDelete: true,
          },
        ],
      })
      .withInertia()

    const newUser = await User.query()
      .where('email', 'test@test.com')
      .preload('permissions')
      .preload('cameraPermissions')
      .orderBy('created_at', 'desc')
      .firstOrFail()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'success',
      message: 'User added successfully',
    })
    response.assertInertiaComponent('users/index')

    assert.lengthOf(newUser.permissions, 3)
    assert.lengthOf(newUser.cameraPermissions, 3)
  })

  test('Should add new user when user is not manager but have permission', async ({ client }) => {
    const defaultOrg = await Organization.firstOrFail()

    const mainUser = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const addUserPerm = await Permission.findByOrFail('name', Permissions.ADD_USER)

    mainUser.related('permissions').create({
      permissionId: addUserPerm.id,
    })

    const camera = await Camera.create({
      label: 'Test',
      resolution: '640*800',
      link: 'rts//test.a',
      organizationId: defaultOrg.id,
    })

    const response = await client
      .post(`/users`)
      .loginAs(mainUser)
      .json({
        email: 'test@test.com',
        password: '123456789',
        canAddCamera: true,
        canAddUser: true,
        canUpdateSettings: true,
        cameraPermissions: [
          {
            cameraId: camera.id,
            canShow: true,
            canEdit: true,
            canDelete: true,
          },
        ],
      })
      .withInertia()

    await User.query()
      .where('email', 'test@test.com')
      .preload('permissions')
      .preload('cameraPermissions')
      .orderBy('created_at', 'desc')
      .firstOrFail()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'success',
      message: 'User added successfully',
    })
    response.assertInertiaComponent('users/index')
  })

  test('Should not add user when user is not manager and not have permission', async ({
    client,
    assert,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    const mainUser = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const camera = await Camera.create({
      label: 'Test',
      resolution: '640*800',
      link: 'rts//test.a',
      organizationId: defaultOrg.id,
    })

    const response = await client
      .post(`/users`)
      .loginAs(mainUser)
      .json({
        email: 'test@test.com',
        password: '123456789',
        canAddCamera: true,
        canAddUser: true,
        canUpdateSettings: true,
        cameraPermissions: [
          {
            cameraId: camera.id,
            canShow: true,
            canEdit: true,
            canDelete: true,
          },
        ],
      })
      .withInertia()

    const newUser = await User.query()
      .where('email', 'test@test.com')
      .preload('permissions')
      .preload('cameraPermissions')
      .orderBy('created_at', 'desc')
      .first()

    assert.isNull(newUser)

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'error',
      message: 'Unauthorized action',
    })
    response.assertInertiaComponent('cameras/index')
  })
})
