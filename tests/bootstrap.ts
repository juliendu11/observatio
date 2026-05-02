import { assert } from '@japa/assert'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'
import { browserClient } from '@japa/browser-client'
import { sessionBrowserClient } from '@adonisjs/session/plugins/browser_client'
import { authBrowserClient } from '@adonisjs/auth/plugins/browser_client'
import initSetupDB from '#tests/hooks/setup/init_setup_db'
import * as availableReporters from '@japa/runner/reporters'
import japaUiReporter from '@juliendu11/japa-ui-reporter'
import { apiClient, ApiResponse } from '@japa/api-client'
import { inertiaApiClient } from '@adonisjs/inertia/plugins/api_client'
import { sessionApiClient } from '@adonisjs/session/plugins/api_client'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import env from '#start/env'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),
  browserClient({
    runInSuites: ['browser'],
    contextOptions: {
      locale: 'en-GB',
    },
  }),
  sessionBrowserClient(app),
  authBrowserClient(app),

  sessionApiClient(app),
  apiClient({
    baseURL: `http://${env.get('HOST')}:${env.get('PORT')}`,
  }),
  inertiaApiClient(app),
  authApiClient(app),
]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [
    async () => {
      await testUtils.db().migrate()
      await testUtils.db().truncate()
      await initSetupDB()
    },
  ],
  teardown: [
    (e) => {
      e.end()
    },
  ],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}

export const reporters: Config['reporters'] = {
  activated: ['ui'],
  list: [
    availableReporters.ndjson(),
    availableReporters.spec(),
    japaUiReporter.ui({
      killPortsInUse: true,
      livePreview: false,
    }),
  ],
}

/**
 * Extend ApiResponse to add custom assertions or getters
 */
ApiResponse.macro('assertNotificationContains', function (this: any, data: any) {
  const props = this.inertiaProps
  const notification = props?.flash?.notification || {}

  this.assert!.containsSubset(notification, data)
})
declare module '@japa/api-client' {
  interface ApiResponse {
    assertNotificationContains(data: any): void
  }
}
