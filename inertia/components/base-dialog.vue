<template>
  <div
    v-if="model"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-lg shadow-lg w-11/12 max-w-lg p-6">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
const model = defineModel({
  type: Boolean,
  required: true,
})
</script>
