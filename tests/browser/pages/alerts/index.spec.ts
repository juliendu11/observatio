import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import Organization from '#models/organization'
import Setting from '#models/setting'

test.group('Alerts index page', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Should render form correctly', async ({ visit, browserContext }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await Setting.create({ organizationId: defaultOrg.id })

    await browserContext.loginAs(user)
    const page = await visit('/alerts')

    await page.assertPath('/alerts')
    await page.assertExists(page.locator('form'))
    await page.assertExists(page.locator('button[type="submit"]'))
  })

  test('Should display existing telegram settings', async ({ visit, browserContext }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await Setting.create({
      organizationId: defaultOrg.id,
      telegramBotToken: 'my-bot-token',
      telegramChatId: '123456789',
    })

    await browserContext.loginAs(user)
    const page = await visit('/alerts')

    const botTokenInput = page.locator('input').first()
    const botChatIdInput = page.locator('input').last()

    await page.assertInputValue(botTokenInput, 'my-bot-token')
    await page.assertInputValue(botChatIdInput, '123456789')
  })
})
