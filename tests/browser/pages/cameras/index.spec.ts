import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { CameraFactory } from '#database/factories/camera_factory'
import Organization from '#models/organization'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import RecordingPubSubService from '#services/recording_pubsub_service'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'

test.group('Cameras index page', (group) => {
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

  test('Should redirect to login when not authenticated', async ({ visit }) => {
    const page = await visit('/cameras')

    await page.assertPath('/login')
  })

  test('Should render correctly', async ({ visit, browserContext }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/cameras')

    await page.assertPath('/cameras')
  })

  test('Should display camera cards when cameras exist', async ({ visit, browserContext }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    const camera = await CameraFactory.merge({
      organizationId: defaultOrg.id,
      userId: user.id,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/cameras')

    await page.assertExists(page.locator('.card'))

    const card = page.locator('.card')

    await page.assertTextContains(card, camera.label)
    await page.assertTextContains(card, camera.resolution)
    await page.assertExists(card.locator(`a[href="/cameras/${camera.id}"]`))
    await page.assertExists(card.getByTestId('previewBtn'))
    await page.assertExists(card.getByTestId('deleteBtn'))
  })

  test('Should show add camera button for manager', async ({ visit, browserContext }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/cameras')

    await page.assertExists(page.locator('a[href="/cameras/create"]'))
  })

  test('Should show add camera button for normal user with correct permission', async ({
    visit,
    browserContext,
  }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const addCamPerm = await Permission.findByOrFail('name', Permissions.ADD_CAMERA)

    await user.related('permissions').create({
      permissionId: addCamPerm.id,
    })

    await browserContext.loginAs(user)
    const page = await visit('/cameras')

    await page.assertExists(page.locator('a[href="/cameras/create"]'))
  })

  test('Should not show add camera button for normal user with no permission', async ({
    visit,
    browserContext,
  }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/cameras')

    await page.assertNotExists(page.locator('a[href="/cameras/create"]'))
  })
})
