<template>
  <Head :title="camera.label" />
  <div class="space-y-6">
    <h1 class="text-3xl font-bold mb-6 text-center">
      {{ camera.label }} - {{ camera.resolution }}
    </h1>

    <div class="flex justify-center">
      <video ref="video" controls width="640"></video>
    </div>

    <div class="flex flex-col gap-4">
      <p class="p-4 pb-2 text-xs opacity-60 tracking-wide">Vidéos</p>

      <div
        v-for="daily in camera.dailies"
        :key="daily.id"
        class="card card-border bg-base-200 w-full cursor-pointer"
        :class="{ 'border-primary': dailySelected && dailySelected.id === daily.id }"
        @click="dailySelected = daily"
      >
        <div class="card-body">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="card-title mb-2">{{ daily.date }}</h2>
              <small>{{ daily.path }}</small>
            </div>
            <div
              class="flex"
              :class="[
                daily.convertHlsToMp4JobId && daily.convertHlsToMp4JobStatus === 'PENDING'
                  ? 'gap-5'
                  : 'gap-1',
              ]"
            >
              <div class="flex items-center gap-1">
                <div class="flex flex-col gap-1">
                  <button
                    @click.stop="onClickDownloadDaily(daily)"
                    class="btn btn-circle"
                    :class="{
                      'btn-disabled':
                        daily.convertHlsToMp4JobId && daily.convertHlsToMp4JobStatus === 'PENDING',
                    }"
                  >
                    <span
                      v-if="
                        daily.convertHlsToMp4JobId && daily.convertHlsToMp4JobStatus === 'PENDING'
                      "
                      class="loading loading-spinner absolute h-12 w-12"
                    ></span>
                    <ArrowDownTrayIcon class="h-5 w-5" />
                  </button>
                  <small
                    v-if="daily.convertHlsToMp4JobId && daily.convertHlsToMp4JobStatus === 'ERROR'"
                    class="block text-center text-error"
                    >Erreur</small
                  >
                </div>
                <button
                  v-if="daily.convertHlsToMp4JobId && daily.convertHlsToMp4JobStatus === 'PENDING'"
                  @click.stop="onClickCancelDailyConversion(daily)"
                  class="btn btn-error btn-outline btn-circle"
                  type="button"
                >
                  <XMarkIcon class="h-5 w-5" />
                </button>
              </div>
              <Link
                @click.stop
                class="btn btn-circle"
                :href="`/cameras/${camera.id}/dailies/${daily.id}`"
                method="delete"
              >
                <TrashIcon class="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Head, Link } from '@inertiajs/vue3'
import { ref, useTemplateRef, watch } from 'vue'
import { TrashIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/vue/24/solid'
import { useSSESubscription } from '~/composables/useSSESubscription'
import { HlsToMp4JobStatuses } from '#enums/HlsToMp4JobStatuses'

const props = defineProps<{
  camera: any
}>()

const video = useTemplateRef<HTMLVideoElement>('video')

const dailySelected = ref<any>()

const loadVideo = (link: string | undefined | number) => {
  if (!link) return
  if (!video.value) return

  const videoSrc = link

  if (Hls.isSupported()) {
    const hls = new Hls()
    hls.loadSource(videoSrc)
    hls.attachMedia(video.value)
    console.log('HLS is supported, video source set.')
  } else if (video.value.canPlayType('application/vnd.apple.mpegurl')) {
    video.value.src = videoSrc
  }
}

const createLink = (daily: any) => {
  console.log(daily)
  return `/api/cameras/${props.camera.id}/medias?url=${daily.path}`
}

watch(dailySelected, (value) => {
  if (!value) return

  const link = createLink(value)
  loadVideo(link)
})

const { onResult } = useSSESubscription<any>(`cameras/${props.camera.id}/convert`)

onResult((data) => {
  const daily = props.camera.dailies.findIndex((d: any) => d.id === data.id)

  if (daily === -1) return

  props.camera.dailies[daily].convertHlsToMp4JobStatus = data.convertHlsToMp4JobStatus
  props.camera.dailies[daily].convertHlsToMp4JobId = data.convertHlsToMp4JobId

  if (data.convertHlsToMp4JobStatus === HlsToMp4JobStatuses.DONE) {
    const url = data.mp4Path
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.camera.label.replaceAll(' ', '_')}_${data.date}.mp4`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }
})

const onClickDownloadDaily = async (daily: any) => {
  const response = await fetch(`/api/cameras/${props.camera.id}/dailies/${daily.id}`)
  if (response.status === 200) {
    const data = await response.blob()

    const url = window.URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.camera.label.replaceAll(' ', '_')}_${daily.date}.mp4`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
    return
  }
}

const onClickCancelDailyConversion = async (daily: any) => {
  await fetch(`/api/cameras/${props.camera.id}/dailies/${daily.id}`, {
    method: 'DELETE',
  })
}
</script>
