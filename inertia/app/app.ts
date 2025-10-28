/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />
import 'vue-sonner/style.css'
import '../css/app.css'
import { createApp, h, watch } from 'vue'
import { toast } from 'vue-sonner'
import type { DefineComponent } from 'vue'
import { createInertiaApp, usePage } from '@inertiajs/vue3'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import MainLayout from '~/layouts/main_layout.vue'
import i18nPlugin from '~/plugins/i18n.plugin'
import servicesPlugin from '~/plugins/services.plugin'
import AuthLayout from '~/layouts/auth_layout.vue'
import { PageProps } from '#config/inertia'

const appName = import.meta.env.VITE_APP_NAME || 'AdonisJS'

createInertiaApp({
  progress: { color: '#5468FF' },

  title: (title) => `${title} - ${appName}`,

  resolve: async (name) => {
    const page = await resolvePageComponent(
      `../pages/${name}.vue`,
      import.meta.glob<DefineComponent>('../pages/**/*.vue')
    )

    if (!name.includes('login') && !name.includes('register') && !name.includes('password')) {
      page.default.layout = page.default.layout || MainLayout
    } else {
      page.default.layout = page.default.layout || AuthLayout
    }

    return page
  },

  setup({ el, App, props, plugin }) {
    createApp({
      render: () => h(App, props),
      setup() {
        const page = usePage<PageProps>()

        watch(
          () => page.props,
          (value) => {
            if (value && value.errors && Object.keys(value.errors).length > 0) {
              Object.values(value.errors).forEach((error) => {
                toast.error(error)
              })
            }

            if (value && value.flash && value.flash.notification) {
              const payload = value.flash.notification
              if (payload.type === 'success') {
                toast.success(payload.message)
              } else if (payload.type === 'error') {
                toast.error(payload.message)
              } else {
                toast.info(payload.message)
              }
            }
          },
          { deep: true, immediate: true }
        )
      },
    })
      .use(plugin)
      .use(i18nPlugin, { initialLanguage: (props?.initialPage?.props?.language as string) ?? 'fr' })
      .use(servicesPlugin)
      .mount(el)
  },
})
