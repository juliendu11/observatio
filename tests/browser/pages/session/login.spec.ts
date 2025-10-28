import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import Organization from '#models/organization'
import sinon from 'sinon'
import RecordingPubSubService from '#services/recording_pubsub_service'
import app from '@adonisjs/core/services/app'

test.group('Login page', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(() => {
    const recordingPubSubServiceStub = sinon.createStubInstance(RecordingPubSubService)

    recordingPubSubServiceStub.publish.resolves()

    app.container.swap(RecordingPubSubService, () => recordingPubSubServiceStub)

    return () => {
      app.container.restoreAll()
    }
  })

  test('Should render correctly', async ({ visit }) => {
    const page = await visit('/login')

    await page.assertTextContains('h2', 'Login')

    const emailInput = page.getByTestId('emailInput')
    const passwordInput = page.getByTestId('passwordInput')
    const submit = page.getByTestId('submitButton')

    await page.assertText(emailInput, 'Email')
    await page.assertText(passwordInput, 'Password')
    await page.assertText(submit, 'Sign in')
  })

  test('Should show validation errors when submit with empty fields', async ({ visit }) => {
    const page = await visit('/login')

    const emailInput = page.getByTestId('emailInput')
    const passwordInput = page.getByTestId('passwordInput')
    const submit = page.getByTestId('submitButton')

    await submit.click()

    await page.assertTextContains(emailInput, 'The email field must be defined')
    await page.assertTextContains(passwordInput, 'The password field must be defined')
  })

  test('Should redirect to home page when login is successful', async ({ visit }) => {
    const defaultOrg = await Organization.firstOrFail()

    await UserFactory.merge({
      organizationId: defaultOrg.id,
      email: 'test@test.com',
      password: '123456789',
    }).create()

    const page = await visit('/login')

    const emailInput = page.getByTestId('emailInput')
    const passwordInput = page.getByTestId('passwordInput')
    const submit = page.getByTestId('submitButton')

    await emailInput.getByRole('textbox').fill('test@test.com')
    await passwordInput.getByRole('textbox').fill('123456789')
    await submit.click()

    await page.assertPath('/cameras')
  })
})
