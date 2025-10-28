import User from '#models/user'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { Permissions } from '#enums/Permissions'
import Camera from '#models/camera'

export default class CameraPolicy extends BasePolicy {
  async view(user: User, camera: Camera): Promise<AuthorizerResponse> {
    if (user.isManager) {
      return true
    }

    if (!user.cameraPermissions) {
      await user.load('cameraPermissions', (query) => {
        query.preload('permission')
      })
    }

    return user.cameraPermissions.some(
      (cameraPermission) =>
        cameraPermission.cameraId === camera.id &&
        cameraPermission.permission.name === Permissions.SHOW_CAMERA
    )
  }

  async delete(user: User, camera: Camera): Promise<AuthorizerResponse> {
    if (user.isManager) {
      return true
    }

    if (!user.cameraPermissions) {
      await user.load('cameraPermissions', (query) => {
        query.preload('permission')
      })
    }

    return user.cameraPermissions.some(
      (cameraPermission) =>
        cameraPermission.cameraId === camera.id &&
        cameraPermission.permission.name === Permissions.DELETE_CAMERA
    )
  }

  async add(user: User): Promise<AuthorizerResponse> {
    if (user.isManager) {
      return true
    }

    if (!user.cameraPermissions) {
      await user.load('permissions', (query) => {
        query.preload('permission')
      })
    }

    return user.permissions.some(
      (permission) => permission.permission.name === Permissions.ADD_CAMERA
    )
  }
}
