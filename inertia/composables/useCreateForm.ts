import { useForm } from '@inertiajs/vue3'
import { watch } from 'vue'

export const useCreateForm = <T extends TForm>(formData: Record<any, any>) => {
  const form = useForm<T>(formData)

  Object.keys(formData).forEach((key) => {
    watch(
      () => form[key],
      () => {
        form.clearErrors(key)
      }
    )
  })

  return { form }
}
