import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'

test.group('Main layout', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Should render correctly', async ({ visit, browserContext }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/logs')

    await page.assertExists(page.locator('a[href="/cameras"]'))
    await page.assertExists(page.locator('a[href="/metrics"]'))
    await page.assertExists(page.locator('a[href="/logs"]'))
    await page.assertExists(page.locator('a[href="/users"]'))
    await page.assertExists(page.locator('a[href="/alerts"]'))
  })

  test('Should not show nav users and alerts if user is not manager and doest have permission', async ({
    visit,
    browserContext,
  }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/logs')

    await page.assertExists(page.locator('a[href="/cameras"]'))
    await page.assertExists(page.locator('a[href="/metrics"]'))
    await page.assertExists(page.locator('a[href="/logs"]'))
    await page.assertNotExists(page.locator('a[href="/users"]'))
    await page.assertNotExists(page.locator('a[href="/alerts"]'))
  })

  test('Should show nav users if user is not manager but have permission', async ({
    visit,
    browserContext,
  }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const perm = await Permission.findByOrFail('name', Permissions.ADD_USER)

    await user.related('permissions').create({
      permissionId: perm.id,
    })

    await browserContext.loginAs(user)
    const page = await visit('/logs')

    await page.assertExists(page.locator('a[href="/users"]'))
  })

  test('Should show nav alerts if user is not manager but have permission', async ({
    visit,
    browserContext,
  }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const perm = await Permission.findByOrFail('name', Permissions.UPDATE_SETTINGS)

    await user.related('permissions').create({
      permissionId: perm.id,
    })

    await browserContext.loginAs(user)
    const page = await visit('/logs')

    await page.assertExists(page.locator('a[href="/alerts"]'))
  })
})
