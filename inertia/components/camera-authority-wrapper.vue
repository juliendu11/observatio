<script setup>
import { h, useSlots } from 'vue'
import { usePermission } from '~/composables/usePermission.js'
import { useCameraPermission } from '~/composables/useCameraPermission.ts'

const props = defineProps({
  value: {
    type: String,
    required: true,
  },
  cameraId: {
    type: Number,
    required: false,
  },
})

const { hasPermission } = useCameraPermission()
const slots = useSlots()

function renderAuth() {
  const { value, cameraId } = props
  if (!value) {
    return slots['default']()
  }
  return hasPermission(cameraId, value) ? slots['default']() : null
}

const root = h(() => renderAuth())
</script>

<template>
  <root></root>
</template>
