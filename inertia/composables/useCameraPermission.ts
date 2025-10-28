import { usePage } from '@inertiajs/vue3'
import { Permissions } from '#enums/Permissions'
import { CameraPermission, PageProps } from '#config/inertia'

export function useCameraPermission() {
  const page = usePage<PageProps>()

  const hasPermission = (cameraId: number, permission: Permissions) => {
    const user = page.props.auth?.user ?? null
    console.log(user)

    if (!user) return false
    if (user.isManager) return true
    if (!user.cameraPermissions || user.cameraPermissions.length === 0) return false

    return user.cameraPermissions.some((camPerm: CameraPermission) => {
      return camPerm.cameraId === cameraId && camPerm.permission.name === permission
    })
  }

  return {
    hasPermission,
  }
}
