import { createI18n } from 'vue-i18n'
import type { App } from 'vue'

import en from '../locales/en.json'
import fr from '../locales/fr.json'
import dayjs from 'dayjs'
import { watch } from 'vue'

export type MessageLanguages = 'en' | 'fr'
// Type-define 'en-US' as the master schema for the resource
export type MessageSchema = typeof en

// See https://vue-i18n.intlify.dev/guide/advanced/typescript.html#global-resource-schema-type-definition

declare module 'vue-i18n' {
  // define the locale messages schema
  export interface DefineLocaleMessage extends MessageSchema {}

  // define the datetime format schema
  export interface DefineDateTimeFormat {}

  // define the number format schema
  export interface DefineNumberFormat {}
}

export default {
  install(app: App, options: { initialLanguage: string }) {
    const i18n = createI18n({
      legacy: false,
      locale: options.initialLanguage ?? 'en',
      globalInjection: true,
      messages: {
        en,
        fr,
      },
    })

    dayjs.locale(i18n.global.locale.value)
    document.documentElement.setAttribute('lang', i18n.global.locale.value)

    watch(i18n.global.locale, (locale) => {
      document.documentElement.setAttribute('lang', locale)
      dayjs.locale(locale)
    })

    app.use(i18n)
  },
}
