import User from '#models/user'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { Permissions } from '#enums/Permissions'

export default class UserPolicy extends BasePolicy {
  async view(user: User): Promise<AuthorizerResponse> {
    if (user.isManager) {
      return true
    }

    if (!user.permissions) {
      await user.load('permissions', (query) => {
        query.preload('permission')
      })
    }

    return user.permissions.some(
      (permission) => permission.permission.name === Permissions.ADD_USER
    )
  }

  async delete(user: User): Promise<AuthorizerResponse> {
    if (user.isManager) {
      return true
    }

    if (!user.permissions) {
      await user.load('permissions', (query) => {
        query.preload('permission')
      })
    }

    return user.permissions.some(
      (permission) => permission.permission.name === Permissions.ADD_USER
    )
  }

  async add(user: User): Promise<AuthorizerResponse> {
    if (user.isManager) {
      return true
    }

    if (!user.permissions) {
      await user.load('permissions', (query) => {
        query.preload('permission')
      })
    }

    return user.permissions.some(
      (permission) => permission.permission.name === Permissions.ADD_USER
    )
  }
}
