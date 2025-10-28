import vine from '@vinejs/vine'

export const updateProfileValidator = vine.compile(
  vine.object({
    theme: vine.enum(['light', 'dark']).optional(),
    language: vine.enum(['fr', 'en']).optional(),
  })
)
