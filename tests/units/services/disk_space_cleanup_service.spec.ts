import { test } from '@japa/runner'
import sinon from 'sinon'
import DiskFileService from '#services/disk_file_service'
import app from '@adonisjs/core/services/app'
import DiskSpaceService from '#services/disk_space_service'
import DiskSpaceCleanupService from '#services/disk_space_cleanup_service'
import testUtils from '@adonisjs/core/services/test_utils'
import { CameraFactory } from '#database/factories/camera_factory'

test.group('services - DiskSpaceCleanupService', (group) => {
  let diskFileServiceStub = sinon.createStubInstance(DiskFileService)
  let diskSpaceServiceStub = sinon.createStubInstance(DiskSpaceService)

  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(() => {
    diskFileServiceStub = sinon.createStubInstance(DiskFileService)
    diskSpaceServiceStub = sinon.createStubInstance(DiskSpaceService)

    diskSpaceServiceStub.getDiskSpace.resolves({
      free: 6 * 1024 * 1024 * 1024,
      size: 15 * 1024 * 1024 * 1024,
    })
    diskFileServiceStub.deleteFolderAndAllFiles.resolves()
    diskFileServiceStub.deleteFile.resolves()

    app.container.swap(DiskFileService, () => diskFileServiceStub)
    app.container.swap(DiskSpaceService, () => diskSpaceServiceStub)

    return () => {
      app.container.restoreAll()
    }
  })

  test('Should not delete anything because remaining space is superior to 5 go', async ({
    assert,
  }) => {
    diskSpaceServiceStub.getDiskSpace.resolves({
      free: 8 * 1024 * 1024 * 1024,
      size: 15 * 1024 * 1024 * 1024,
    })

    const instance = new DiskSpaceCleanupService(diskFileServiceStub, diskSpaceServiceStub)
    await instance.execute()

    assert.equal(diskFileServiceStub.deleteFolderAndAllFiles.callCount, 0)
  })

  test('Should delete 2 oldest because remaining space is inferior to 5 go', async ({ assert }) => {
    const camera = await CameraFactory.merge({
      resolution: '360x480',
      link: 'rtsp://test.com',
      id: 999,
    }).create()

    await camera.related('dailies').create({
      label: '2026-04-30',
      path: `/cameras/${camera.id}/2026-04-30/stream.m3u8`,
      date: '2026-04-30',
    })

    await camera.related('dailies').create({
      label: '2026-05-01',
      path: `/cameras/${camera.id}/2026-05-01/stream.m3u8`,
      date: '2026-05-01',
    })

    await camera.related('dailies').create({
      label: '2026-05-02',
      path: `/cameras/${camera.id}/2026-05-02/stream.m3u8`,
      date: '2026-05-02',
    })

    diskSpaceServiceStub.getDiskSpace.resolves({
      free: 2 * 1024 * 1024 * 1024,
      size: 15 * 1024 * 1024 * 1024,
    })

    const instance = new DiskSpaceCleanupService(diskFileServiceStub, diskSpaceServiceStub)
    await instance.execute()

    assert.equal(diskFileServiceStub.deleteFolderAndAllFiles.callCount, 2)

    const firstCallDeleteFolderAndAllFiles = diskFileServiceStub.deleteFolderAndAllFiles.firstCall
    const secondCallDeleteFolderAndAllFiles = diskFileServiceStub.deleteFolderAndAllFiles.secondCall

    assert.include(
      firstCallDeleteFolderAndAllFiles.args[0],
      `/storage/cameras/${camera.id}/2026-04-30`
    )
    assert.include(
      secondCallDeleteFolderAndAllFiles.args[0],
      `/storage/cameras/${camera.id}/2026-05-01`
    )
  })
})
