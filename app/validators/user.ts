import vine from '@vinejs/vine'

export const createUserValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(8),
    canAddCamera: vine.boolean(),
    canAddUser: vine.boolean(),
    canUpdateSettings: vine.boolean(),
    cameraPermissions: vine.array(
      vine.object({
        cameraId: vine.number(),
        canShow: vine.boolean(),
        canEdit: vine.boolean(),
        canDelete: vine.boolean(),
      })
    ),
  })
)
