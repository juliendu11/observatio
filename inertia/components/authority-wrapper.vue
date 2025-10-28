<script setup>
import { h, useSlots } from 'vue'
import { usePermission } from '~/composables/usePermission.js'

const props = defineProps({
  value: {
    type: String,
    required: true,
  },
})

const { hasPermission } = usePermission()
const slots = useSlots()

function renderAuth() {
  const { value } = props
  if (!value) {
    return slots['default']()
  }
  return hasPermission(value) ? slots['default']() : null
}

const root = h(() => renderAuth())
</script>

<template>
  <root></root>
</template>
