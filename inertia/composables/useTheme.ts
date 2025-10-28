import { usePage, router } from '@inertiajs/vue3'
import { computed, ref, watch } from 'vue'
import { PageProps } from '#config/inertia'

export const useTheme = () => {
  const page = usePage<PageProps>()

  const localTheme = ref(document.documentElement.getAttribute('data-theme'))

  const theme = computed(() => page.props?.auth?.user?.theme ?? localTheme.value)

  watch(
    theme,
    (newTheme) => {
      if (!newTheme) return
      document.documentElement.setAttribute('data-theme', newTheme)
    },
    { immediate: true }
  )

  const toggleTheme = () => {
    const newTheme = theme.value === 'light' ? 'dark' : 'light'

    const authUser = page.props.auth?.user
    if (authUser?.id) {
      router.patch(
        `/profile`,
        { theme: newTheme },
        {
          preserveScroll: true,
          preserveState: true,
          only: ['auth'],
        }
      )
    } else {
      localTheme.value = newTheme
    }
  }

  return {
    toggleTheme,
    theme,
  }
}
