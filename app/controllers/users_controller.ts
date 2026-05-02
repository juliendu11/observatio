import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Camera from '#models/camera'
import Permission from '#models/permission'
import { Permissions } from '#enums/Permissions'
import { createUserValidator } from '#validators/user'
import UserPolicy from '#policies/user_policy'

export default class UsersController {
  async index({ inertia, auth, bouncer, response, session, i18n }: HttpContext) {
    const currentUser = auth.getUserOrFail()

    if (!(await bouncer.with(UserPolicy).allows('view'))) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('cameras.index')
    }

    const users = await User.query()
      .where('organization_id', currentUser.organizationId)
      .preload('permissions', (query) => {
        query.preload('permission')
      })
      .preload('cameraPermissions', (query) => {
        query.preload('permission')
        query.preload('camera')
      })

    const cameras = await Camera.query().where('organization_id', currentUser.organizationId)

    return inertia.render('users/index', {
      users: users,
      cameras,
      currentUser: {
        id: currentUser.id,
        email: currentUser.email,
        isManager: currentUser.isManager,
      },
    })
  }

  async store({ request, response, auth, bouncer, session, i18n }: HttpContext) {
    const payload = await request.validateUsing(createUserValidator)
    const currentUser = auth.getUserOrFail()

    if (!(await bouncer.with(UserPolicy).allows('add'))) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('users.index')
    }

    const user = await User.create({
      email: payload.email,
      password: payload.password,
      organizationId: currentUser.organizationId,
      isManager: false,
    })

    const addCameraPermission = await Permission.query()
      .where('name', Permissions.ADD_CAMERA)
      .firstOrFail()
    const showCameraPermission = await Permission.query()
      .where('name', Permissions.SHOW_CAMERA)
      .firstOrFail()
    const editCameraPermission = await Permission.query()
      .where('name', Permissions.EDIT_CAMERA)
      .firstOrFail()
    const deleteCameraPermission = await Permission.query()
      .where('name', Permissions.DELETE_CAMERA)
      .firstOrFail()
    const addUserPermission = await Permission.query()
      .where('name', Permissions.ADD_USER)
      .firstOrFail()
    const updateSettingsPermission = await Permission.query()
      .where('name', Permissions.UPDATE_SETTINGS)
      .firstOrFail()

    if (payload.canAddCamera) {
      await user.related('permissions').create({
        permissionId: addCameraPermission.id,
      })
    }

    if (payload.canAddUser) {
      await user.related('permissions').create({
        permissionId: addUserPermission.id,
      })
    }

    if (payload.canUpdateSettings) {
      await user.related('permissions').create({
        permissionId: updateSettingsPermission.id,
      })
    }

    for (const cameraPermission of payload.cameraPermissions) {
      if (cameraPermission.canShow) {
        await user.related('cameraPermissions').create({
          cameraId: cameraPermission.cameraId,
          permissionId: showCameraPermission.id,
        })
      }

      if (cameraPermission.canEdit) {
        await user.related('cameraPermissions').create({
          cameraId: cameraPermission.cameraId,
          permissionId: editCameraPermission.id,
        })
      }

      if (cameraPermission.canDelete) {
        await user.related('cameraPermissions').create({
          cameraId: cameraPermission.cameraId,
          permissionId: deleteCameraPermission.id,
        })
      }
    }

    session.flash('notification', {
      type: 'success',
      message: i18n.t('messages.user_added_success'),
    })

    return response.redirect().toRoute('users.index')
  }

  async destroy({ params, response, auth, session, i18n, bouncer }: HttpContext) {
    const currentUser = auth.getUserOrFail()

    if (!(await bouncer.with(UserPolicy).allows('delete'))) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('users.index')
    }

    const userToDelete = await User.find(params.id)

    if (!userToDelete) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.user_not_found'),
      })
      return response.redirect().toRoute('users.index')
    }

    if (userToDelete.id === currentUser.id) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('users.index')
    }

    if (userToDelete.isManager) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('users.index')
    }

    if (userToDelete.organizationId !== currentUser.organizationId) {
      session.flash('notification', {
        type: 'error',
        message: i18n.t('messages.action_not_allowed'),
      })
      return response.redirect().toRoute('users.index')
    }

    await userToDelete.delete()

    session.flash('notification', {
      type: 'success',
      message: i18n.t('messages.user_deleted_success'),
    })

    return response.redirect().toRoute('users.index')
  }
}
