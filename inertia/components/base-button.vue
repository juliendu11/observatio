<template>
  <button class="btn" :class="color ? `btn-${color}` : ''" :type="type" :disabled="isLoading">
    <span v-if="isLoading" class="loading loading-spinner"></span>
    <slot v-else />
  </button>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    color?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
    isLoading?: boolean
  }>(),
  {
    type: 'button',
  }
)
</script>
