import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import Camera from '#models/camera'
import RecordingPubSubService, { RECORDING_CHANNELS } from '#services/recording_pubsub_service'

test.group('Inertia - cameras/store', (group) => {
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

  test('Should add new camera when user is manager', async ({ client, assert }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    const response = await client.post(`/cameras`).loginAs(user).withInertia().json({
      label: 'Garage',
      link: 'rtsp://FAKE_LINK',
      resolution: '360x450',
    })

    const camera = await Camera.findBy('label', 'Garage')

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'success',
      message: 'Camera added successfully',
    })
    response.assertInertiaComponent('cameras/index')

    assert.isNotNull(camera)

    assert.equal(recordingPubSubServiceStub.publish.callCount, 1)

    const callArgs = recordingPubSubServiceStub.publish.getCall(0).args
    assert.equal(callArgs[0], RECORDING_CHANNELS.CAMERA_ADD)
    assert.deepEqual(callArgs[1], { cameraId: camera!.id })
  })

  test('Should add new camera when user is not manager but have permission', async ({
    client,
    assert,
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

    const response = await client.post(`/cameras`).loginAs(user).withInertia().json({
      label: 'Garage',
      link: 'rtsp://FAKE_LINK',
      resolution: '360x450',
    })

    const camera = await Camera.findBy('label', 'Garage')

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'success',
      message: 'Camera added successfully',
    })
    response.assertInertiaComponent('cameras/index')

    assert.isNotNull(camera)

    assert.equal(recordingPubSubServiceStub.publish.callCount, 1)

    const callArgs = recordingPubSubServiceStub.publish.getCall(0).args
    assert.equal(callArgs[0], RECORDING_CHANNELS.CAMERA_ADD)
    assert.deepEqual(callArgs[1], { cameraId: camera!.id })
  })

  test('Should not add new camera when user is not manager and not have permission', async ({
    client,
    assert,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const response = await client.post(`/cameras`).loginAs(user).withInertia().json({
      label: 'Garage',
      link: 'rtsp://FAKE_LINK',
      resolution: '360x450',
    })

    const camera = await Camera.findBy('label', 'Garage')

    response.assertStatus(200)
    response.assertNotificationContains({
      type: 'error',
      message: 'Unauthorized action',
    })
    response.assertInertiaComponent('cameras/index')

    assert.isNull(camera)
  })
})
