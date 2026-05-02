import { test } from '@japa/runner'
import CameraRecorder from '#core/camera_recorder'
import testUtils from '@adonisjs/core/services/test_utils'
import { CameraFactory } from '#database/factories/camera_factory'
import sinon from 'sinon'
import FFMPEGService from '#services/ffmpeg_service'
import { Logger } from '@adonisjs/core/logger'
import CameraRecorderHealthChecker from '#core/camera_recorder_health_checker'
import CameraRecorderFileChecker from '#core/camera_recorder_file_checker'
import dayjs from 'dayjs'
import emitter from '@adonisjs/core/services/emitter'

test.group('core - CameraRecorder', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Should start recording, health and file checker when call start()', async ({
    assert,
    cleanup,
  }) => {
    const events = emitter.fake()
    cleanup(() => {
      emitter.restore()
    })

    const camera = await CameraFactory.merge({
      resolution: '360x480',
      link: 'rtsp://test.com',
    }).create()
    const ffmpegServiceStub = sinon.createStubInstance(FFMPEGService)
    const loggerStub = sinon.createStubInstance(Logger)
    const cameraRecorderHealthCheckerStub = sinon.createStubInstance(CameraRecorderHealthChecker)
    const cameraRecorderFileCheckerStub = sinon.createStubInstance(CameraRecorderFileChecker)

    ffmpegServiceStub.recordRTSPToHLS.returns({
      args: [],
      process: {} as any,
    })

    loggerStub.info.returns()
    loggerStub.warn.returns()
    loggerStub.error.returns()

    loggerStub.child.returns(loggerStub)

    const instance = new CameraRecorder(
      camera,
      ffmpegServiceStub,
      loggerStub,
      cameraRecorderHealthCheckerStub,
      cameraRecorderFileCheckerStub
    )

    await instance.start()

    assert.equal(ffmpegServiceStub.recordRTSPToHLS.callCount, 1)
    const firstCallRecordRTSPToHLS = ffmpegServiceStub.recordRTSPToHLS.firstCall
    assert.deepEqual(firstCallRecordRTSPToHLS.args[0], camera.link)
    assert.deepEqual(firstCallRecordRTSPToHLS.args[1], camera.resolution)
    assert.deepEqual(firstCallRecordRTSPToHLS.args[2], 60)
    assert.include(
      firstCallRecordRTSPToHLS.args[3],
      `/storage/cameras/${camera.id}/${dayjs().format('YYYY-MM-DD')}`
    )
    assert.isDefined(firstCallRecordRTSPToHLS.args[4])
    assert.isDefined(firstCallRecordRTSPToHLS.args[5])

    assert.equal(cameraRecorderHealthCheckerStub.start.callCount, 1)
    assert.equal(cameraRecorderFileCheckerStub.start.callCount, 1)

    events.assertEmitted('camera:status', ({ data }) => {
      return data.camera.id === camera.id && data.isAlive === true
    })
  })

  test('Should restart recording, health and file checker after 5s when error', async ({
    assert,
  }) => {
    const camera = await CameraFactory.merge({
      resolution: '360x480',
      link: 'rtsp://test.com',
    }).create()
    const ffmpegServiceStub = sinon.createStubInstance(FFMPEGService)
    const loggerStub = sinon.createStubInstance(Logger)
    const cameraRecorderHealthCheckerStub = sinon.createStubInstance(CameraRecorderHealthChecker)
    const cameraRecorderFileCheckerStub = sinon.createStubInstance(CameraRecorderFileChecker)

    const process = {
      kill: sinon.stub(),
      pid: 5998,
    }

    ffmpegServiceStub.recordRTSPToHLS.returns({
      args: [],
      process: process as any,
    })

    loggerStub.info.returns()
    loggerStub.warn.returns()
    loggerStub.error.returns()

    loggerStub.child.returns(loggerStub)

    let aliveList: boolean[] = []

    const instance = new CameraRecorder(
      camera,
      ffmpegServiceStub,
      loggerStub,
      cameraRecorderHealthCheckerStub,
      cameraRecorderFileCheckerStub,
      {
        timer: { beforeRestart: { time: 0.1 } },
      }
    )
    instance.aliveListener = (isAlive) => {
      aliveList.push(isAlive)
    }

    await instance.start()

    const firstCallRecordRTSPToHLS = ffmpegServiceStub.recordRTSPToHLS.firstCall
    const errorHandler = firstCallRecordRTSPToHLS.args[4]

    errorHandler(new Error('Test error'))

    assert.equal(cameraRecorderHealthCheckerStub.stop.callCount, 1)
    assert.equal(cameraRecorderFileCheckerStub.stop.callCount, 1)
    assert.equal(process.kill.callCount, 1)
    assert.deepEqual(aliveList, [true, false])

    // WAIT 5S
    await new Promise((resolve) => setTimeout(resolve, 200))

    assert.equal(ffmpegServiceStub.recordRTSPToHLS.callCount, 2)

    assert.equal(cameraRecorderHealthCheckerStub.start.callCount, 2)
    assert.equal(cameraRecorderFileCheckerStub.start.callCount, 2)
  })

  test('Should set isAlive to false when file checker send set is alive to false', async ({
    assert,
  }) => {
    const camera = await CameraFactory.merge({
      resolution: '360x480',
      link: 'rtsp://test.com',
    }).create()
    const ffmpegServiceStub = sinon.createStubInstance(FFMPEGService)
    const loggerStub = sinon.createStubInstance(Logger)
    const cameraRecorderHealthCheckerStub = sinon.createStubInstance(CameraRecorderHealthChecker)
    const cameraRecorderFileCheckerStub = sinon.createStubInstance(CameraRecorderFileChecker)

    const process = {
      kill: sinon.stub(),
      pid: 5998,
    }

    ffmpegServiceStub.recordRTSPToHLS.returns({
      args: [],
      process: process as any,
    })

    loggerStub.info.returns()
    loggerStub.warn.returns()
    loggerStub.error.returns()

    loggerStub.child.returns(loggerStub)

    let aliveList: boolean[] = []

    const instance = new CameraRecorder(
      camera,
      ffmpegServiceStub,
      loggerStub,
      cameraRecorderHealthCheckerStub,
      cameraRecorderFileCheckerStub,
      {
        timer: { beforeRestart: { time: 0.1 } },
      }
    )
    instance.aliveListener = (isAlive) => {
      aliveList.push(isAlive)
    }

    await instance.start()

    cameraRecorderFileCheckerStub.isAlive = false

    assert.deepEqual(aliveList, [true, false])
  })

  test('Should restart recording when day changes at midnight', async ({ assert, cleanup }) => {
    const clock = sinon.useFakeTimers({
      now: Date.now(),
      shouldClearNativeTimers: true,
      toFake: ['setTimeout', 'clearTimeout', 'Date'],
    })
    cleanup(() => clock.restore())

    const camera = await CameraFactory.merge({
      resolution: '360x480',
      link: 'rtsp://test.com',
    }).create()

    const ffmpegServiceStub = sinon.createStubInstance(FFMPEGService)
    const loggerStub = sinon.createStubInstance(Logger)
    const cameraRecorderHealthCheckerStub = sinon.createStubInstance(CameraRecorderHealthChecker)
    const cameraRecorderFileCheckerStub = sinon.createStubInstance(CameraRecorderFileChecker)

    const process = {
      kill: sinon.stub(),
      pid: 5998,
    }

    let resolveSecondRun!: () => void
    const secondRunStarted = new Promise<void>((resolve) => {
      resolveSecondRun = resolve
    })
    let recordCallCount = 0
    ffmpegServiceStub.recordRTSPToHLS.callsFake(() => {
      recordCallCount++
      if (recordCallCount === 2) {
        setImmediate(resolveSecondRun)
      }
      return { args: [], process: process as any }
    })

    loggerStub.info.returns()
    loggerStub.warn.returns()
    loggerStub.error.returns()
    loggerStub.child.returns(loggerStub)

    const instance = new CameraRecorder(
      camera,
      ffmpegServiceStub,
      loggerStub,
      cameraRecorderHealthCheckerStub,
      cameraRecorderFileCheckerStub
    )

    await instance.start()

    assert.equal(ffmpegServiceStub.recordRTSPToHLS.callCount, 1)

    const now = dayjs()
    const msUntilMidnight = now.add(1, 'day').startOf('day').diff(now)

    await clock.tickAsync(msUntilMidnight + 100)
    await secondRunStarted

    assert.equal(process.kill.callCount, 1)
    assert.equal(cameraRecorderHealthCheckerStub.stop.callCount, 1)
    assert.equal(cameraRecorderFileCheckerStub.stop.callCount, 1)
    assert.equal(ffmpegServiceStub.recordRTSPToHLS.callCount, 2)
    assert.equal(cameraRecorderHealthCheckerStub.start.callCount, 2)
    assert.equal(cameraRecorderFileCheckerStub.start.callCount, 2)
  })

  test('Should set isAlive to false when file checker send set is alive to false then emit camera:status', async ({
    assert,
    cleanup,
  }) => {
    const events = emitter.fake()
    cleanup(() => {
      emitter.restore()
    })

    const camera = await CameraFactory.merge({
      resolution: '360x480',
      link: 'rtsp://test.com',
    }).create()
    const ffmpegServiceStub = sinon.createStubInstance(FFMPEGService)
    const loggerStub = sinon.createStubInstance(Logger)
    const cameraRecorderHealthCheckerStub = sinon.createStubInstance(CameraRecorderHealthChecker)
    const cameraRecorderFileCheckerStub = sinon.createStubInstance(CameraRecorderFileChecker)

    const process = {
      kill: sinon.stub(),
      pid: 5998,
    }

    ffmpegServiceStub.recordRTSPToHLS.returns({
      args: [],
      process: process as any,
    })

    loggerStub.info.returns()
    loggerStub.warn.returns()
    loggerStub.error.returns()

    loggerStub.child.returns(loggerStub)

    let aliveList: boolean[] = []

    const instance = new CameraRecorder(
      camera,
      ffmpegServiceStub,
      loggerStub,
      cameraRecorderHealthCheckerStub,
      cameraRecorderFileCheckerStub,
      {
        timer: { beforeRestart: { time: 0.1 } },
      }
    )
    instance.aliveListener = (isAlive) => {
      aliveList.push(isAlive)
    }

    await instance.start()

    cameraRecorderFileCheckerStub.isAlive = false

    assert.deepEqual(aliveList, [true, false])

    events.assertEmitted('camera:status', ({ data }) => {
      return data.camera.id === camera.id && data.isAlive === false
    })
  })
})
