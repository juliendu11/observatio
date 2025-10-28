import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import Organization from '#models/organization'
import app from '@adonisjs/core/services/app'
import SystemMetricsService from '#services/system_metrics_service'
import sinon from 'sinon'

const fakeMetrics = {
  cpu: { usage: 42, cores: 4 },
  memory: {
    total: 8 * 1024 * 1024 * 1024,
    used: 4 * 1024 * 1024 * 1024,
    free: 4 * 1024 * 1024 * 1024,
    usagePercent: 50,
  },
  disk: {
    total: 100 * 1024 * 1024 * 1024,
    used: 50 * 1024 * 1024 * 1024,
    free: 50 * 1024 * 1024 * 1024,
    usagePercent: 50,
  },
}

test.group('Metrics index page', (group) => {
  let systemMetricsServiceStub: sinon.SinonStubbedInstance<SystemMetricsService>

  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(() => {
    systemMetricsServiceStub = sinon.createStubInstance(SystemMetricsService)

    app.container.swap(SystemMetricsService, () => systemMetricsServiceStub)

    systemMetricsServiceStub.getMetrics.resolves(fakeMetrics)

    return () => {
      app.container.restoreAll()
    }
  })

  test('Should render correctly when authenticated', async ({ visit, browserContext }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/metrics')

    await page.assertPath('/metrics')
  })

  test('Should display CPU, memory and disk metrics', async ({ visit, browserContext, assert }) => {
    const defaultOrg = await Organization.firstOrFail()
    const user = await UserFactory.merge({
      organizationId: defaultOrg.id,
      isManager: true,
    }).create()

    await browserContext.loginAs(user)
    const page = await visit('/metrics')

    const cpuUsageContainer = page.getByTestId('cpuUsage')
    const memoryUsageContainer = page.getByTestId('memoryUsage')
    const diskUsageContainer = page.getByTestId('diskUsage')

    const cpuUsagePercentage = await cpuUsageContainer
      .getByRole('progressbar')
      .getAttribute('value')
    const memoryUsagePercentage = await memoryUsageContainer
      .getByRole('progressbar')
      .getAttribute('value')
    const diskUsagePercentage = await diskUsageContainer
      .getByRole('progressbar')
      .getAttribute('value')

    assert.equal(cpuUsagePercentage, '42')
    assert.equal(memoryUsagePercentage, '50')
    assert.equal(diskUsagePercentage, '50')

    cpuUsageContainer.getByText('42%')
    cpuUsageContainer.getByText('Cores: 4')

    memoryUsageContainer.getByText('50%')
    memoryUsageContainer.getByText('Used: 4 GB')
    memoryUsageContainer.getByText('Total: 8 GB')
    memoryUsageContainer.getByText('Free: 4 GB')

    diskUsageContainer.getByText('50%')
    diskUsageContainer.getByText('Used: 50 GB')
    diskUsageContainer.getByText('Total: 100 GB')
    diskUsageContainer.getByText('Free: 50 GB')
  })
})
