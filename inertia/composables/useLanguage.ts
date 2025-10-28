import { usePage, router } from '@inertiajs/vue3'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PageProps } from '#config/inertia'

export const useLanguage = () => {
  const page = usePage<PageProps>()
  const { locale } = useI18n()

  const language = computed(() => {
    return page.props?.auth?.user?.language ?? locale.value
  })

  watch(
    language,
    (newLang) => {
      if (!newLang) return
      document.documentElement.setAttribute('lang', newLang)
      locale.value = newLang
    },
    { immediate: true }
  )

  const toggleLanguage = () => {
    const newLang = language.value === 'en' ? 'fr' : 'en'

    const authUser = page.props.auth?.user
    if (authUser && authUser?.id) {
      router.patch(
        `/profile`,
        { language: newLang },
        {
          preserveScroll: true,
          preserveState: true,
          only: ['auth'],
        }
      )
    } else {
      locale.value = newLang
    }
  }

  return {
    toggleLanguage,
    language,
  }
}
