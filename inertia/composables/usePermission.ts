import { usePage } from '@inertiajs/vue3'
import { Permissions } from '#enums/Permissions'
import { PageProps } from '#config/inertia'

export function usePermission() {
  const page = usePage<PageProps>()

  const hasPermission = (permission: Permissions) => {
    const user = page.props.auth?.user ?? null

    if (!user) return false
    if (user.isManager) return true
    if (!user.permissions || user.permissions.length === 0) return false

    const userPermissions = user.permissions.map((perm) => perm.permission.name)
    if (!userPermissions.includes(permission)) {
      return false
    }

    return true
  }

  return {
    hasPermission,
  }
}
