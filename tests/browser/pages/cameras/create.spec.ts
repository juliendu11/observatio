import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import Organization from '#models/organization'
import app from '@adonisjs/core/services/app'
import RecordingPubSubService from '#services/recording_pubsub_service'
import sinon from 'sinon'

test.group('Cameras create page', (group) => {
  let recordingPubSubService: sinon.SinonStubbedInstance<RecordingPubSubService>

  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(() => {
    recordingPubSubService = sinon.createStubInstance(RecordingPubSubService)

    app.container.swap(RecordingPubSubService, () => recordingPubSubService)

    return () => {
      app.container.restoreAll()
    }
  })

  test('Should render form correctly ', async ({ visit, browserContext }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/cameras/create')

    await page.assertPath('/cameras/create')
    await page.assertExists(page.locator('form'))
    await page.assertExists(page.locator('button[type="submit"]'))
  })

  test('Should create camera and redirect to cameras index on valid submission', async ({
    visit,
    browserContext,
  }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/cameras/create')

    await page.getByTestId('label').getByRole('textbox').fill('My Camera')
    await page.getByTestId('link').getByRole('textbox').fill('rtsp://example.com/stream')
    await page.click('button[type="submit"]')

    await page.assertPath('/cameras')

    await page.assertElementsCount('.camera-card', 1)
  })
})
