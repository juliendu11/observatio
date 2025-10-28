<template>
  <Head :title="t('login.title')" />

  <div class="flex justify-center pt-10 md:items-center md:pt-0 min-h-screen">
    <div class="card md:card-border md:bg-base-200 w-96">
      <div class="card-body">
        <h2 class="card-title mx-auto">{{ t('login.title') }}</h2>
        <form @submit.prevent="form.post('/login')">
          <fieldset class="space-y-4">
            <BaseFormInput
              v-model="form.email"
              :label="t('login.form.email')"
              :error="form.errors.email"
              data-testid="emailInput"
            />
            <BaseFormInput
              v-model="form.password"
              :label="t('login.form.password')"
              type="password"
              :error="form.errors.password"
              data-testid="passwordInput"
            />
            <div class="card-actions justify-end">
              <BaseButton
                :is-loading="form.processing"
                color="primary"
                type="submit"
                data-testid="submitButton"
              >
                {{ t('login.form.submit') }}
              </BaseButton>
            </div>
          </fieldset>
        </form>
      </div>
    </div>

    <div class="flex items-center fixed bottom-4 right-4 gap-4">
      <LanguageSwicther />
      <ThemeSwitcher />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Head } from '@inertiajs/vue3'
import BaseFormInput from '~/components/base-form-input.vue'
import { useCreateForm } from '~/composables/useCreateForm'
import LanguageSwicther from '~/components/language-swicther.vue'
import ThemeSwitcher from '~/components/theme-switcher.vue'
import BaseButton from '~/components/base-button.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { form } = useCreateForm<{
  email: string
  password: string
}>({
  email: '',
  password: '',
})
</script>
