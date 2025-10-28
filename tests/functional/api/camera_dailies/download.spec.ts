import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import Camera from '#models/camera'
import app from '@adonisjs/core/services/app'
import sinon from 'sinon'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import SSEService from '#services/sse_service'

test.group('API - api.camera.daily.download', (group) => {
  let sseServiceStub: sinon.SinonStubbedInstance<SSEService>

  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(() => {
    sseServiceStub = sinon.createStubInstance(SSEService)

    sseServiceStub.emitConvertHlsToMp4Status.resolves()

    app.container.swap(SSEService, () => sseServiceStub)

    return () => {
      app.container.restoreAll()
    }
  })

  test('Should start convert job when user is manager', async ({ client, assert }) => {
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
    const daily = await camera.related('dailies').create({
      label: '1',
      path: '/1.file',
      date: '05/04/2026',
    })

    const response = await client.get(`/api/cameras/${camera.id}/dailies/${daily.id}`).loginAs(user)

    assert.equal(sseServiceStub.emitConvertHlsToMp4Status.callCount, 1)

    response.assertStatus(204)
  })

  test('Should start convert job when user is not manager but have permission', async ({
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

    const deleteCameraPerm = await Permission.findByOrFail('name', Permissions.SHOW_CAMERA)

    await user.related('cameraPermissions').create({
      permissionId: deleteCameraPerm.id,
      cameraId: camera.id,
    })

    const daily = await camera.related('dailies').create({
      label: '1',
      path: '/1.file',
      date: '05/04/2026',
    })

    const response = await client.get(`/api/cameras/${camera.id}/dailies/${daily.id}`).loginAs(user)

    assert.equal(sseServiceStub.emitConvertHlsToMp4Status.callCount, 1)

    response.assertStatus(204)
  })

  test('Should not start convert job when user is not manager and not have permission', async ({
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

    const daily = await camera.related('dailies').create({
      label: '1',
      path: '/1.file',
      date: '05/04/2026',
    })

    const response = await client.get(`/api/cameras/${camera.id}/dailies/${daily.id}`).loginAs(user)

    assert.equal(sseServiceStub.emitConvertHlsToMp4Status.callCount, 0)

    response.assertStatus(401)
    response.assertBody({
      code: 'E_ACTION_NOT_ALLOWED',
      errors: [
        {
          message: 'You are not allowed to perform this action.',
        },
      ],
    })
  })

  test('Should not start job if authorized user but file converted already exist', async ({
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
    const daily = await camera.related('dailies').create({
      label: '1',
      path: '/1.file',
      date: '05/04/2026',
      mp4Path: 'test.mp4',
    })

    const response = await client.get(`/api/cameras/${camera.id}/dailies/${daily.id}`).loginAs(user)

    assert.equal(sseServiceStub.emitConvertHlsToMp4Status.callCount, 0)

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/mp4')
  })
})
