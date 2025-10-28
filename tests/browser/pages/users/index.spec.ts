import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import Organization from '#models/organization'
import Camera from '#models/camera'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import User from '#models/user'

test.group('Users index page', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Should redirect to login when not authenticated', async ({ visit }) => {
    const page = await visit('/users')

    await page.assertPath('/login')
  })

  test('Should render user list correctly ', async ({ visit, browserContext, assert }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    const camera = await Camera.create({
      label: 'Garage',
      link: 'rtsp://test',
      resolution: '360x460',
      organizationId: defaultOrg.id,
      userId: user.id,
    })

    const user1 = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: false,
    }).create()

    const addCameraPerm = await Permission.findByOrFail('name', Permissions.ADD_CAMERA)
    const showCameraPerm = await Permission.findByOrFail('name', Permissions.SHOW_CAMERA)

    user1.related('permissions').create({
      permissionId: addCameraPerm.id,
    })
    user1.related('cameraPermissions').create({
      permissionId: showCameraPerm.id,
      cameraId: camera.id,
    })

    await browserContext.loginAs(user)
    const page = await visit('/users')

    await page.assertPath('/users')
    await page.assertExists(page.locator('table'))

    const row1 = page.locator('table').locator('tr').nth(0)
    const row2 = page.locator('table').locator('tr').nth(1)
    const row3 = page.locator('table').locator('tr').nth(2)

    // Header row: 4 columns (email, generalPermissions, cameraPermissions, actions)
    assert.equal(await row1.locator('th').count(), 4)

    // First data row: 4 columns present
    assert.equal(await row2.locator('td').count(), 4)
    await page.assertExists(row2.locator('td').nth(0))
    await page.assertTextContains(row2.locator('td').nth(1).locator('.badge').first(), 'ALL')
    await page.assertExists(row2.locator('td').nth(2))
    await page.assertExists(row2.locator('td').nth(3).locator('button, span'))

    // Second data row: same 4 columns
    assert.equal(await row3.locator('td').count(), 4)
    await page.assertExists(row3.locator('td').nth(0))
    await page.assertTextContains(row3.locator('td').nth(1).locator('.badge').first(), 'ADD_CAMERA')
    await page.assertTextContains(row3.locator('td').nth(2).first(), 'Garage:')
    await page.assertTextContains(
      row3.locator('td').nth(2).locator('.badge').first(),
      'SHOW_CAMERA'
    )
    await page.assertExists(row3.locator('td').nth(3).locator('button, span'))
  })

  test('Should show add user form for manager', async ({ visit, browserContext }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/users')

    await page.assertExists(page.locator('form'))
  })

  test('Should add user when complete form and submit', async ({
    visit,
    browserContext,
    assert,
  }) => {
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
    const page = await visit('/users')

    await page.getByTestId('emailInput').getByRole('textbox').fill('test@test.com')
    await page.getByTestId('passwordInput').getByRole('textbox').fill('123456789')

    await page.getByTestId('canAddCameraCheckbox').setChecked(true)

    await page.getByTestId('canViewCameraCheckbox').setChecked(true)
    await page.getByTestId('canEditCameraCheckbox').setChecked(true)

    await page.getByTestId('submitButton').click()

    await page.assertTextContains('body', 'User added successfully')

    const newUser = await User.findBy('email', 'test@test.com')

    assert.isNotNull(newUser)

    assert.equal(await page.locator('table').locator('tr').count(), 3)
  })
})
