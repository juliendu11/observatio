<template>
  <fieldset class="fieldset">
    <legend v-if="label" class="fieldset-legend">{{ label }}</legend>
    <select
      v-model="localValue"
      class="select select-bordered w-full"
      :class="{ 'border-error select-error': error }"
      :data-cy="dataCy"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :data-testid="option.value"
      >
        {{ option.text }}
      </option>
    </select>
    <div v-if="error" class="label">
      <span class="label-text-alt text-error">
        {{ error }}
      </span>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type BaseSelectValue = {
  text: string
  value: string
}

const props = defineProps<{
  dataCy?: string
  error?: string
  label?: string
  modelValue: number | string
  options: BaseSelectValue[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | string): void
}>()

const localValue = computed({
  get() {
    return props.modelValue
  },
  set(newValue: number | string) {
    emit('update:modelValue', newValue)
  },
})
</script>
