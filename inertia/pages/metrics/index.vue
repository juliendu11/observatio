<template>
  <Head :title="t('metrics.title')" />

  <div class="space-y-6">
    <h1 class="text-3xl font-bold text-center">{{ t('metrics.title') }}</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title flex items-center gap-2">
            <CpuChipIcon class="h-6 w-6" />
            {{ t('metrics.cpu.title') }}
          </h2>

          <div class="mt-4" data-testid="cpuUsage">
            <div class="flex justify-between mb-2">
              <span class="text-sm">{{ t('metrics.cpu.usage') }}</span>
              <span class="text-sm font-semibold">{{ cpuUsage.toFixed(1) }}%</span>
            </div>
            <progress
              class="progress progress-primary w-full"
              :value="cpuUsage"
              max="100"
            ></progress>

            <div class="mt-4 text-sm opacity-70">
              <p>{{ t('metrics.cpu.cores') }}: {{ cpuCores }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title flex items-center gap-2">
            <CircleStackIcon class="h-6 w-6" />
            {{ t('metrics.memory.title') }}
          </h2>

          <div class="mt-4" data-testid="memoryUsage">
            <div class="flex justify-between mb-2">
              <span class="text-sm">{{ t('metrics.memory.usage') }}</span>
              <span class="text-sm font-semibold">{{ memoryUsagePercent.toFixed(1) }}%</span>
            </div>
            <progress
              class="progress progress-secondary w-full"
              :value="memoryUsagePercent"
              max="100"
            ></progress>

            <div class="mt-4 text-sm opacity-70 space-y-1">
              <p>{{ t('metrics.memory.used') }}: {{ formatBytes(memoryUsed) }}</p>
              <p>{{ t('metrics.memory.total') }}: {{ formatBytes(memoryTotal) }}</p>
              <p>{{ t('metrics.memory.free') }}: {{ formatBytes(memoryFree) }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title flex items-center gap-2">
            <ServerIcon class="h-6 w-6" />
            {{ t('metrics.disk.title') }}
          </h2>

          <div class="mt-4" data-testid="diskUsage">
            <div class="flex justify-between mb-2">
              <span class="text-sm">{{ t('metrics.disk.usage') }}</span>
              <span class="text-sm font-semibold">{{ diskUsagePercent.toFixed(1) }}%</span>
            </div>
            <progress
              class="progress progress-accent w-full"
              :value="diskUsagePercent"
              max="100"
            ></progress>

            <div class="mt-4 text-sm opacity-70 space-y-1">
              <p>{{ t('metrics.disk.used') }}: {{ formatBytes(diskUsed) }}</p>
              <p>{{ t('metrics.disk.total') }}: {{ formatBytes(diskTotal) }}</p>
              <p>{{ t('metrics.disk.free') }}: {{ formatBytes(diskFree) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2 text-sm opacity-50">
      <div class="w-2 h-2 rounded-full bg-success animate-pulse"></div>
      <span>{{ t('metrics.liveUpdate') }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Head } from '@inertiajs/vue3'
import { ref } from 'vue'
import { CpuChipIcon, CircleStackIcon, ServerIcon } from '@heroicons/vue/24/outline'
import { useSSESubscription } from '~/composables/useSSESubscription'
import { useI18n } from 'vue-i18n'

import { formatBytes } from '~/helpers/formatters.helper'

const { t } = useI18n()

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
  }
  memory: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
  disk: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
}

const props = defineProps<{
  initialMetrics: SystemMetrics
}>()

const cpuUsage = ref(props.initialMetrics.cpu.usage)
const cpuCores = ref(props.initialMetrics.cpu.cores)

const memoryTotal = ref(props.initialMetrics.memory.total)
const memoryUsed = ref(props.initialMetrics.memory.used)
const memoryFree = ref(props.initialMetrics.memory.free)
const memoryUsagePercent = ref(props.initialMetrics.memory.usagePercent)

const diskTotal = ref(props.initialMetrics.disk.total)
const diskUsed = ref(props.initialMetrics.disk.used)
const diskFree = ref(props.initialMetrics.disk.free)
const diskUsagePercent = ref(props.initialMetrics.disk.usagePercent)

const { onResult } = useSSESubscription<SystemMetrics>('system/metrics')

onResult((metrics) => {
  cpuUsage.value = metrics.cpu.usage
  cpuCores.value = metrics.cpu.cores

  memoryTotal.value = metrics.memory.total
  memoryUsed.value = metrics.memory.used
  memoryFree.value = metrics.memory.free
  memoryUsagePercent.value = metrics.memory.usagePercent

  diskTotal.value = metrics.disk.total
  diskUsed.value = metrics.disk.used
  diskFree.value = metrics.disk.free
  diskUsagePercent.value = metrics.disk.usagePercent
})
</script>
