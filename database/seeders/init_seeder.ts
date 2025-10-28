import { BaseSeeder } from '@adonisjs/lucid/seeders'
import env from '#start/env'
import User from '#models/user'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import Organization from '#models/organization'
import Setting from '#models/setting'

export default class extends BaseSeeder {
  async run() {
    const rootUserEmail = env.get('ROOT_USER_EMAIL')
    const rootUserPassword = env.get('ROOT_USER_PASSWORD')

    await Permission.firstOrCreate(
      {
        name: Permissions.ADD_CAMERA,
      },
      {
        name: Permissions.ADD_CAMERA,
      }
    )

    await Permission.firstOrCreate(
      {
        name: Permissions.DELETE_CAMERA,
      },
      {
        name: Permissions.DELETE_CAMERA,
      }
    )

    await Permission.firstOrCreate(
      {
        name: Permissions.ADD_USER,
      },
      {
        name: Permissions.ADD_USER,
      }
    )

    await Permission.firstOrCreate(
      {
        name: Permissions.UPDATE_SETTINGS,
      },
      {
        name: Permissions.UPDATE_SETTINGS,
      }
    )

    await Permission.firstOrCreate(
      {
        name: Permissions.SHOW_CAMERA,
      },
      {
        name: Permissions.SHOW_CAMERA,
      }
    )

    await Permission.firstOrCreate(
      {
        name: Permissions.EDIT_CAMERA,
      },
      {
        name: Permissions.EDIT_CAMERA,
      }
    )

    const org = await Organization.firstOrCreate(
      {
        name: 'Default',
      },
      { name: 'Default' }
    )
    await User.firstOrCreate(
      { email: rootUserEmail },
      {
        email: rootUserEmail,
        password: rootUserPassword,
        organizationId: org.id,
        isManager: true,
      }
    )

    await Setting.firstOrCreate(
      {
        organizationId: org.id,
      },
      {
        organizationId: org.id,
      }
    )
  }
}
