import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Data that should be shared with all rendered alerts
   */
  sharedData: {
    language: (ctx) => ctx.i18n.locale,
    route: (ctx) => ctx.route,
    auth: async (ctx) => {
      const user = ctx.auth.user

      if (!user) return null

      await user.load('permissions', (query) => {
        query.preload('permission')
      })

      await user.load((loader) => {
        loader.load('permissions', (query) => {
          query.preload('permission')
        })
      })

      if (!user.cameraPermissions) {
        await user.load('cameraPermissions', (query) => {
          query.preload('permission')
        })
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          theme: user.theme,
          language: user.language,
          isManager: user.isManager,
          permissions: user.permissions.map((perm) => ({
            permission: {
              name: perm.permission.name,
            },
          })),
          cameraPermissions: user.cameraPermissions.map((camPerm) => ({
            cameraId: camPerm.cameraId,
            permission: {
              name: camPerm.permission.name,
            },
          })),
        },
      }
    },
  },

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: false,
    entrypoint: 'inertia/app/ssr.ts',
  },
})

export default inertiaConfig

export type CameraPermission = {
  cameraId: number
  permission: {
    name: string
  }
}

export type CustomProps = {
  auth: {
    user: {
      id: number
      email: string
      theme: 'light' | 'dark'
      language: string
      isManager: boolean
      permissions: {
        permission: {
          name: string
        }
      }[]
      cameraPermissions: CameraPermission[]
    } | null
  }
  flash: {
    notification?: {
      type: 'success' | 'error' | 'info'
      message: string
    }
  }
}

export type PageProps = InferSharedProps<typeof inertiaConfig> & CustomProps

declare module '@adonisjs/inertia/types' {}
