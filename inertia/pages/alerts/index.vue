<template>
  <Head :title="t('alerts.title')" />

  <div class="space-y-6">
    <h1 class="text-3xl font-bold text-center">{{ t('alerts.title') }}</h1>

    <div class="card bg-base-200">
      <div class="card-body">
        <h2 class="card-title">{{ t('alerts.telegram.title') }}</h2>
        <p class="text-sm text-base-content/70 mb-4">
          {{ t('alerts.telegram.description') }}
        </p>

        <form @submit.prevent="form.patch('/alerts')" class="space-y-4">
          <BaseFormInput
            v-model="form.telegramBotToken"
            :label="t('alerts.telegram.botToken')"
            type="text"
            :error="form.errors.telegramBotToken"
          />

          <BaseFormInput
            v-model="form.telegramChatId"
            :label="t('alerts.telegram.chatId')"
            type="text"
            :error="form.errors.telegramChatId"
          />

          <div class="alert alert-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              class="hidden md:block stroke-current shrink-0 w-6 h-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div class="text-sm">
              <p class="font-semibold">{{ t('alerts.telegram.help.title') }}</p>
              <ul class="list-disc list-inside mt-2 space-y-3 md:space-y-1">
                <li>{{ t('alerts.telegram.help.step1') }}</li>
                <li>{{ t('alerts.telegram.help.step2') }}</li>
                <li>{{ t('alerts.telegram.help.step3') }}</li>
              </ul>
            </div>
          </div>

          <div class="flex justify-end pt-4">
            <BaseButton type="submit" color="primary" :is-loading="form.processing">
              {{ t('common.save') }}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Head } from '@inertiajs/vue3'
import BaseFormInput from '~/components/base-form-input.vue'
import { useCreateForm } from '~/composables/useCreateForm'
import { useI18n } from 'vue-i18n'
import BaseButton from '~/components/base-button.vue'

const { t } = useI18n()

const props = defineProps<{
  telegram: {
    telegramBotToken: string | null
    telegramChatId: string | null
  }
}>()

const { form } = useCreateForm<{
  telegramBotToken: string
  telegramChatId: string
}>({
  telegramBotToken: props.telegram.telegramBotToken || '',
  telegramChatId: props.telegram.telegramChatId || '',
})
</script>
