import vine from '@vinejs/vine'

export const updateAlertValidator = vine.compile(
  vine.object({
    telegramBotToken: vine.string().trim().optional().requiredIfExists('telegramChatId'),
    telegramChatId: vine.string().trim().optional().requiredIfExists('telegramBotToken'),
  })
)
