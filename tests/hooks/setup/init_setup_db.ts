import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import Organization from '#models/organization'

async function initSetupDB() {
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

  await Organization.firstOrCreate(
    {
      name: 'Default',
    },
    { name: 'Default' }
  )
}

export default initSetupDB
