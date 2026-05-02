import { test } from '@japa/runner'
import sinon from 'sinon'
import SSEService from '#services/sse_service'
import FFMPEGService from '#services/ffmpeg_service'
import DiskFileService from '#services/disk_file_service'
import HlsToMp4Job, { HlsToMp4Payload } from '#jobs/hls_to_mp4'
import testUtils from '@adonisjs/core/services/test_utils'
import { CameraFactory } from '#database/factories/camera_factory'
import { HlsToMp4JobStatuses } from '#enums/HlsToMp4JobStatuses'
import app from '@adonisjs/core/services/app'

test.group('jobs - HlsToMp4Job', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Should create mp4 file and save correct information in database then notify user by SSE', async ({
    assert,
    cleanup,
  }) => {
    const SSEServiceStub = sinon.createStubInstance(SSEService)
    SSEServiceStub.emitConvertHlsToMp4Status.returns()

    const FFMPEGServiceStub = sinon.createStubInstance(FFMPEGService)
    FFMPEGServiceStub.convertHLSToMp4.resolves()

    const diskFileServiceStub = sinon.createStubInstance(DiskFileService)
    diskFileServiceStub.createFolderIfNotExist.resolves()
    diskFileServiceStub.readFile.resolves(`
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
segment_005.ts`)

    app.container.swap(SSEService, () => SSEServiceStub)
    app.container.swap(FFMPEGService, () => FFMPEGServiceStub)
    app.container.swap(DiskFileService, () => diskFileServiceStub)

    cleanup(() => {
      app.container.restoreAll()
    })

    const camera = await CameraFactory.merge({
      resolution: '360x480',
      link: 'rtsp://test.com',
      id: 999,
    }).create()

    const cameraDaily = await camera.related('dailies').create({
      label: '2026-05-02',
      path: `/cameras/${camera.id}/2026-05-02/stream.m3u8`,
      date: '2026-05-02',
    })

    const jobData: HlsToMp4Payload = {
      cameraId: camera.id,
      cameraDailyId: cameraDaily.id,
      day: '2026-05-02',
    }

    const instance = new HlsToMp4Job()
    await instance.handle({ data: jobData } as any)

    await cameraDaily.refresh()

    assert.equal(cameraDaily.mp4Path, `/cameras/${camera.id}/2026-05-02/mp4/output.mp4`)
    assert.equal(cameraDaily.convertHlsToMp4JobStatus, HlsToMp4JobStatuses.DONE)
    assert.equal(cameraDaily.convertHlsToMp4LastChunk, 'segment_005.ts')

    assert.equal(FFMPEGServiceStub.convertHLSToMp4.callCount, 1)
    const firstCallConvertHLSToMp4 = FFMPEGServiceStub.convertHLSToMp4.firstCall
    assert.include(
      firstCallConvertHLSToMp4.args[0],
      `/storage/cameras/${camera.id}/${jobData.day}/stream.m3u8`
    )
    assert.include(
      firstCallConvertHLSToMp4.args[1],
      `/storage/cameras/${camera.id}/${jobData.day}/mp4/list.txt`
    )
    assert.include(
      firstCallConvertHLSToMp4.args[2],
      `/storage/cameras/${camera.id}/${jobData.day}/mp4/all.ts`
    )
    assert.include(
      firstCallConvertHLSToMp4.args[3],
      `/storage/cameras/${camera.id}/${jobData.day}/mp4/output.mp4`
    )

    assert.equal(SSEServiceStub.emitConvertHlsToMp4Status.callCount, 1)
    const firstCallEmitConvertHlsToMp4Status = SSEServiceStub.emitConvertHlsToMp4Status.firstCall
    assert.equal(firstCallEmitConvertHlsToMp4Status.args[0].id, cameraDaily.id)
  })
})
