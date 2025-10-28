import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { CameraFactory } from '#database/factories/camera_factory'
import Organization from '#models/organization'
import sinon from 'sinon'
import RecordingPubSubService from '#services/recording_pubsub_service'
import app from '@adonisjs/core/services/app'

test.group('Camera show page', (group) => {
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
    const page = await visit('/cameras/1')

    await page.assertPath('/login')
  })

  test('Should render camera details when authenticated and authorized', async ({
    visit,
    browserContext,
  }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()
    const camera = await CameraFactory.merge({
      organizationId: defaultOrg.id,
      userId: user.id,
    }).create()

    camera.related('dailies')

    await browserContext.loginAs(user)
    const page = await visit(`/cameras/${camera.id}`)

    await page.assertPath(`/cameras/${camera.id}`)
    await page.assertTextContains('h1', camera.label)
  })
})
