<template>
  <button class="btn btn-square" @click="toggleLanguage">
    <transition name="icon-fade" mode="out-in" appear>
      <img v-if="language === 'en'" class="h-5" :src="enFlag" alt="english flag" />
      <img v-else class="h-5" :src="frFlag" alt="french flag" />
    </transition>
  </button>
</template>

<script lang="ts" setup>
import frFlag from '/public/flags/fr.svg'
import enFlag from '/public/flags/en.svg'

import { useLanguage } from '~/composables/useLanguage'

const { language, toggleLanguage } = useLanguage()
</script>
