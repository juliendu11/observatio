<template>
  <Head title="Cameras" />

  <div class="relative">
    <div class="grid md:grid-cols-2 gap-5">
      <CameraCard v-for="camera in cameras" :key="camera.id" :camera="camera" />
    </div>

    <AuthorityWrapper :value="Permissions.ADD_CAMERA">
      <div class="fixed bottom-3 right-3">
        <Link href="/cameras/create" class="btn btn-circle">
          <PlusIcon class="h-5 w-5" />
        </Link>
      </div>
    </AuthorityWrapper>
  </div>
</template>

<script lang="ts" setup>
import { Head, Link } from '@inertiajs/vue3'
import { PlusIcon } from '@heroicons/vue/24/solid'
import CameraCard from '~/components/camera-card.vue'
import AuthorityWrapper from '~/components/authority-wrapper.vue'
import { Permissions } from '#enums/Permissions'

defineProps<{
  cameras: any[]
}>()
</script>
