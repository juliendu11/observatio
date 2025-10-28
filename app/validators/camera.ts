import vine from '@vinejs/vine'

export const createCameraValidator = vine.compile(
  vine.object({
    label: vine.string(),
    link: vine.string(),
    resolution: vine.string().regex(/^\d+x\d+$/),
  })
)
