<template>
  <fieldset class="fieldset" :data-testid="dataTestid">
    <legend v-if="label || $slots.append" class="fieldset-legend w-full">
      <div v-if="$slots.append" class="flex items-center justify-between w-full">
        {{ label }}
        <slot name="append" />
      </div>
      <template v-else-if="label && !$slots.append">
        {{ label }}
      </template>
    </legend>
    <input
      class="input w-full"
      :readOnly="readOnly"
      v-model="localValue"
      :type="type"
      :class="{
        'input-error': error,
        'bg-transparent pointer-events-none outline-none': readOnly,
      }"
    />
    <div v-if="error" class="label">
      <span class="label-text-alt text-error">
        {{ error }}
      </span>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  dataCy?: string
  dataTestid?: string
  error?: string
  label?: string
  modelValue: null | number | string
  readOnly?: boolean
  type?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | string): void
}>()

const localValue = computed({
  get() {
    return props.modelValue
  },
  set(newValue) {
    emit('update:modelValue', newValue)
  },
})
</script>
