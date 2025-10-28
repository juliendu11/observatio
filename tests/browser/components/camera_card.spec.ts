import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import Camera from '#models/camera'
import sinon from 'sinon'
import RecordingPubSubService from '#services/recording_pubsub_service'
import app from '@adonisjs/core/services/app'

test.group('Camera card', (group) => {
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

  test('Should render correctly', async ({ visit, browserContext }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await Camera.create({
      label: 'Garage',
      link: 'rtsp://test',
      resolution: '360x460',
      organizationId: defaultOrg.id,
      userId: user.id,
    })

    await browserContext.loginAs(user)
    const page = await visit(`/cameras`)

    await page.assertExists(page.getByTestId('deleteBtn'))
    await page.assertExists(page.getByTestId('previewBtn'))
  })

  test('Should not show delete & preview btn if user is not manager and doest have permission', async ({
    visit,
    browserContext,
  }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    await Camera.create({
      label: 'Garage',
      link: 'rtsp://test',
      resolution: '360x460',
      organizationId: defaultOrg.id,
      userId: user.id,
    })

    await browserContext.loginAs(user)
    const page = await visit(`/cameras`)

    await page.assertNotExists(page.locator('.card').getByTestId('deleteBtn'))
    await page.assertNotExists(page.locator('.card').getByTestId('previewBtn'))
  })

  test('Should show delete btn if user is not manager but have permission', async ({
    visit,
    browserContext,
  }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const camera = await Camera.create({
      label: 'Garage',
      link: 'rtsp://test',
      resolution: '360x460',
      organizationId: defaultOrg.id,
      userId: user.id,
    })

    const showPerm = await Permission.findByOrFail('name', Permissions.SHOW_CAMERA)
    const deletePerm = await Permission.findByOrFail('name', Permissions.DELETE_CAMERA)

    await user.related('cameraPermissions').create({
      permissionId: showPerm.id,
      cameraId: camera.id,
    })

    await user.related('cameraPermissions').create({
      permissionId: deletePerm.id,
      cameraId: camera.id,
    })

    await browserContext.loginAs(user)
    const page = await visit(`/cameras`)

    await page.assertExists(page.locator('.card').getByTestId('deleteBtn'))
  })

  test('Should show preview btn if user is not manager but have permission', async ({
    visit,
    browserContext,
  }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const camera = await Camera.create({
      label: 'Garage',
      link: 'rtsp://test',
      resolution: '360x460',
      organizationId: defaultOrg.id,
      userId: user.id,
    })

    const showPerm = await Permission.findByOrFail('name', Permissions.SHOW_CAMERA)

    await user.related('cameraPermissions').create({
      permissionId: showPerm.id,
      cameraId: camera.id,
    })

    await browserContext.loginAs(user)
    const page = await visit(`/cameras`)

    await page.assertExists(page.locator('.card').getByTestId('previewBtn'))
  })
})
