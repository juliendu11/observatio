<template>
  <div class="card card-border bg-base-200 w-full camera-card">
    <div class="card-body">
      <h2 class="card-title">{{ camera.label }}</h2>
      <p>{{ t('cameras.card.resolution') }}: {{ camera.resolution }}</p>

      <div class="h-[300px] rounded-md mt-3 relative bg-black flex items-center justify-center">
        <video ref="videoElement" class="w-full h-full object-contain" muted autoplay></video>
        <div v-if="!streamRunning" class="absolute inset-0 flex items-center justify-center">
          <span class="text-gray-400">{{ t('cameras.card.noPreview') }}</span>
        </div>
      </div>
      <div class="card-actions flex justify-between gap-3 mt-5">
        <div>
          <CameraAuthorityWrapper :camera-id="camera.id" :value="Permissions.SHOW_CAMERA">
            <button
              class="btn btn-primary btn-outline"
              @click="toggleStream"
              :disabled="loading"
              data-testid="previewBtn"
            >
              {{ streamRunning ? t('cameras.card.stop') : t('cameras.card.preview') }}
            </button>
          </CameraAuthorityWrapper>
        </div>
        <div class="space-x-2">
          <Link :href="`/cameras/${camera.id}`" class="btn btn-primary" prefetch>{{
            t('cameras.card.open')
          }}</Link>

          <CameraAuthorityWrapper :camera-id="camera.id" :value="Permissions.DELETE_CAMERA">
            <Link
              :href="`/cameras/${camera.id}`"
              method="delete"
              class="btn btn-error btn-outline"
              data-testid="deleteBtn"
            >
              {{ t('cameras.card.delete') }}
            </Link>
          </CameraAuthorityWrapper>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onUnmounted, ref } from 'vue'
import { Link } from '@inertiajs/vue3'
import { useI18n } from 'vue-i18n'
import { Permissions } from '#enums/Permissions'
import CameraAuthorityWrapper from '~/components/camera-authority-wrapper.vue'
import { CameraForList } from '~/types'

const { t } = useI18n()

const props = defineProps<{
  camera: CameraForList
}>()

const videoElement = ref<HTMLVideoElement | null>(null)
const loading = ref(false)
const streamRunning = ref(false)

let ws: WebSocket | null = null
let mediaSource: MediaSource | null = null
let sourceBuffer: SourceBuffer | null = null
let queue: Uint8Array[] = []
let isAppending = false

const toggleStream = () => {
  if (streamRunning.value) {
    stopStream()
  } else {
    runStream()
  }
}

const runStream = () => {
  if (!videoElement.value || streamRunning.value) {
    return
  }

  loading.value = true
  streamRunning.value = true

  // Create the MediaSource
  mediaSource = new MediaSource()
  videoElement.value.src = URL.createObjectURL(mediaSource)

  mediaSource.addEventListener('sourceopen', () => {
    // Create the SourceBuffer with the MP4/H.264 codec
    try {
      sourceBuffer = mediaSource!.addSourceBuffer('video/mp4; codecs="avc1.64001f"')

      sourceBuffer.mode = 'sequence'

      // Listen when the buffer is ready to receive more data
      sourceBuffer.addEventListener('updateend', processQueue)

      // Connect to the WebSocket
      connectWebSocket()
    } catch (error) {
      console.error('Error creation SourceBuffer:', error)
      stopStream()
    }
  })

  mediaSource.addEventListener('sourceended', () => {
    console.log('MediaSource finsihed')
  })

  mediaSource.addEventListener('sourceclose', () => {
    console.log('MediaSource closed')
  })
}

const connectWebSocket = () => {
  // Build the WebSocket URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/cameras/${props.camera.id}/streaming`

  ws = new WebSocket(wsUrl)
  ws.binaryType = 'arraybuffer'

  ws.addEventListener('open', () => {
    loading.value = false
  })

  ws.addEventListener('message', (event) => {
    if (event.data instanceof ArrayBuffer) {
      const chunk = new Uint8Array(event.data)
      queue.push(chunk)
      processQueue()
    }
  })

  ws.addEventListener('error', (error) => {
    loading.value = false

    console.error('WebSocket error:', error)
  })

  ws.addEventListener('close', () => {
    console.log('WebSocket closed')

    stopStream()
  })
}

const processQueue = () => {
  // If we are already adding data, wait
  if (isAppending || !sourceBuffer || sourceBuffer.updating) {
    return
  }

  // If the queue is empty, there's nothing to be done.
  if (queue.length === 0) {
    return
  }

  try {
    isAppending = true
    const chunk = queue.shift()!

    // Add the chunk to the buffer
    sourceBuffer.appendBuffer(chunk)

    // Manage the buffer to prevent it from becoming too large
    if (sourceBuffer.buffered.length > 0) {
      const bufferedEnd = sourceBuffer.buffered.end(0)
      const currentTime = videoElement.value?.currentTime || 0

      // Keep only the last 30 seconds
      if (bufferedEnd - currentTime > 30) {
        const removeEnd = currentTime - 5
        if (removeEnd > 0) {
          sourceBuffer.remove(0, removeEnd)
        }
      }
    }
  } catch (error) {
    console.error('Error appending to SourceBuffer:', error)
  } finally {
    isAppending = false
  }
}

const stopStream = () => {
  if (ws) {
    ws.close()
    ws = null
  }

  if (sourceBuffer) {
    sourceBuffer.removeEventListener('updateend', processQueue)
    sourceBuffer = null
  }

  if (mediaSource && mediaSource.readyState === 'open') {
    try {
      mediaSource.endOfStream()
    } catch (error) {
      console.error('Erreur lors de la fermeture du MediaSource:', error)
    }
  }

  if (videoElement.value) {
    videoElement.value.src = ''
  }

  queue = []
  isAppending = false
  streamRunning.value = false
  loading.value = false
  mediaSource = null
}

onUnmounted(() => {
  stopStream()
})
</script>

<style scoped>
video {
  background-color: #000;
}
</style>
