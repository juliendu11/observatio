import TelegramBot from 'node-telegram-bot-api'

export default class TelegramNotificationService {
  private bot: TelegramBot | null = null
  private telegramBotToken: string = ''
  private telegramChatId: string = ''

  install(telegramBotToken: string, telegramChatId: string) {
    this.telegramBotToken = telegramBotToken
    this.telegramChatId = telegramChatId

    this.bot = new TelegramBot(this.telegramBotToken, { polling: false })
  }

  async sendMessage(message: string): Promise<boolean> {
    if (!this.bot || !this.telegramChatId) {
      return false
    }

    await this.bot.sendMessage(this.telegramChatId, message, { parse_mode: 'Markdown' })

    return true
  }
}
