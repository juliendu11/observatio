import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import Organization from '#models/organization'
import transmit from '@adonisjs/transmit/services/main'

test.group('Logs index page', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Should redirect to login when not authenticated', async ({ visit }) => {
    const page = await visit('/logs')

    await page.assertPath('/login')
  })

  test('Should render correctly when authenticated', async ({ visit, browserContext }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/logs')

    await page.assertPath('/logs')
  })

  test('Should live logs work correctly', async ({ visit, browserContext }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/logs')

    await page.assertPath('/logs')
    await page.waitForTimeout(1000)

    transmit.broadcast('system/log', {
      level: 30,
      time: 1775411548721,
      pid: 88579,
      hostname: '2a02-7401-8043-a1a2.rev.ads.net',
      msg: 'Starting MetricsScheduler',
    })

    await page.waitForTimeout(1000)

    await page.assertExists(page.locator('table'))

    const row2 = page.locator('table').locator('tr').nth(1)

    await page.assertTextContains(row2.locator('td').nth(0), '17:52:28')

    await page.assertTextContains(row2.locator('td').nth(1), 'INFO')
    await page.assertTextContains(row2.locator('td').nth(2), '88579')

    await page.assertTextContains(row2.locator('td').nth(3), '2a02-7401-8043-a1a2.rev.ads.net')
    await page.assertTextContains(row2.locator('td').nth(5), 'Starting MetricsScheduler')
  })
})
