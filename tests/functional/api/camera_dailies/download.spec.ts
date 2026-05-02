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
import DiskFileService from '#services/disk_file_service'

test.group('API - api.camera.daily.download', (group) => {
  let sseServiceStub: sinon.SinonStubbedInstance<SSEService>
  let diskFileService: sinon.SinonStubbedInstance<DiskFileService>

  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(() => {
    sseServiceStub = sinon.createStubInstance(SSEService)
    diskFileService = sinon.createStubInstance(DiskFileService)

    sseServiceStub.emitConvertHlsToMp4Status.resolves()
    diskFileService.readFile.resolves('')

    app.container.swap(SSEService, () => sseServiceStub)
    app.container.swap(DiskFileService, () => diskFileService)

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

  test('Should not start job if authorized user but file converted already exist and is not outdated', async ({
    client,
    assert,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    diskFileService.readFile.resolves(`
    #EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:67
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:66.666667,
segment_000.ts
#EXTINF:58.333333,
segment_001.ts
#EXTINF:58.333333,
segment_002.ts
#EXTINF:58.333333,
segment_003.ts
#EXTINF:58.333333,
segment_004.ts
#EXTINF:66.666667,
segment_005.ts
    `)

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
      convertHlsToMp4LastChunk: 'segment_005.ts',
    })

    const response = await client.get(`/api/cameras/${camera.id}/dailies/${daily.id}`).loginAs(user)

    assert.equal(sseServiceStub.emitConvertHlsToMp4Status.callCount, 0)

    response.assertStatus(200)
  })

  test('Should start job if authorized user, file converted already exist but is outdated', async ({
    client,
    assert,
  }) => {
    const defaultOrg = await Organization.firstOrFail()

    diskFileService.readFile.resolves(`
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:67
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:66.666667,
segment_000.ts
#EXTINF:58.333333,
segment_001.ts
#EXTINF:58.333333,
segment_002.ts
#EXTINF:58.333333,
segment_003.ts
#EXTINF:58.333333,
segment_004.ts
#EXTINF:66.666667,
segment_005.ts
#EXTINF:58.333333,
segment_006.ts
#EXTINF:58.333333,
segment_007.ts
#EXTINF:58.333333,
segment_008.ts
#EXTINF:58.333333,
segment_009.ts
#EXTINF:66.666667,
segment_010.ts

    `)

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
      convertHlsToMp4LastChunk: 'segment_005.ts',
    })

    const response = await client.get(`/api/cameras/${camera.id}/dailies/${daily.id}`).loginAs(user)

    assert.equal(sseServiceStub.emitConvertHlsToMp4Status.callCount, 1)

    response.assertStatus(204)
  })
})
