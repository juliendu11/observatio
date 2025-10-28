<template>
  <Head title="Ajouter une caméra" />

  <form @submit.prevent="form.post('/cameras')">
    <fieldset class="space-y-4">
      <BaseFormInput
        v-model="form.label"
        label="Label"
        name="label"
        :error="form.errors.label"
        data-testid="label"
      />
      <BaseFormInput
        v-model="form.link"
        label="Link"
        name="link"
        :error="form.errors.link"
        data-testid="link"
      />
      <BaseSelect
        v-model="form.resolution"
        label="Résolution"
        :error="form.errors.resolution"
        name="resolution"
        :options="[
          { text: '360p', value: '480x360' },
          { text: '480p', value: '640x480' },
          { text: '720p', value: '1280x720' },
          { text: '1080p', value: '1920x1080' },
        ]"
        data-testid="resolution"
      />
      <div class="flex justify-end">
        <button class="btn btn-primary" type="submit">Ajouter</button>
      </div>
    </fieldset>
  </form>
</template>

<script lang="ts" setup>
import { Head } from '@inertiajs/vue3'
import BaseFormInput from '~/components/base-form-input.vue'
import { useCreateForm } from '~/composables/useCreateForm'
import BaseSelect from '~/components/base-select.vue'

const { form } = useCreateForm<{
  label: string
  link: string
  resolution: string
}>({
  label: '',
  link: '',
  resolution: '480x360',
})
</script>
