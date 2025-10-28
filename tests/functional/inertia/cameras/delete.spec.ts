import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import Camera from '#models/camera'
import app from '@adonisjs/core/services/app'
import sinon from 'sinon'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import RecordingPubSubService, { RECORDING_CHANNELS } from '#services/recording_pubsub_service'

test.group('Inertia - cameras/delete', (group) => {
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

  test('Should delete camera and remove from recorder service when user is manager', async ({
    client,
    assert,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    const camera = await Camera.create({
      label: 'Test',
      link: 'rtsp://test',
      resolution: '360x460',
      organizationId: defaultOrg.id,
      userId: user.id,
    })

    const response = await client.delete(`/cameras/${camera.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'success',
      message: 'Camera deleted successfully',
    })
    response.assertInertiaComponent('cameras/index')

    assert.equal(recordingPubSubServiceStub.publish.callCount, 1)

    const callArgs = recordingPubSubServiceStub.publish.getCall(0).args
    assert.equal(callArgs[0], RECORDING_CHANNELS.CAMERA_REMOVE)
    assert.deepEqual(callArgs[1], { cameraId: camera!.id })
  })

  test('Should delete camera and remove from recorder service when user is not manager but have permission', async ({
    assert,
    client,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const camera = await Camera.create({
      label: 'Test',
      link: 'rtsp://test',
      resolution: '360x460',
      organizationId: defaultOrg.id,
      userId: user.id,
    })

    const deleteCameraPerm = await Permission.findByOrFail('name', Permissions.DELETE_CAMERA)

    await user.related('cameraPermissions').create({
      permissionId: deleteCameraPerm.id,
      cameraId: camera.id,
    })

    const response = await client.delete(`/cameras/${camera.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'success',
      message: 'Camera deleted successfully',
    })
    response.assertInertiaComponent('cameras/index')

    assert.equal(recordingPubSubServiceStub.publish.callCount, 1)

    const callArgs = recordingPubSubServiceStub.publish.getCall(0).args
    assert.equal(callArgs[0], RECORDING_CHANNELS.CAMERA_REMOVE)
    assert.deepEqual(callArgs[1], { cameraId: camera!.id })
  })

  test('Should not delete camera when user is not manager and not have permission', async ({
    client,
    assert,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const camera = await Camera.create({
      label: 'Test',
      link: 'rtsp://test',
      resolution: '360x460',
      organizationId: defaultOrg.id,
      userId: user.id,
    })

    const response = await client.delete(`/cameras/${camera.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'error',
      message: 'Unauthorized action',
    })
    response.assertInertiaComponent('cameras/index')

    assert.equal(recordingPubSubServiceStub.publish.callCount, 0)
  })
})
