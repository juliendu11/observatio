<template>
  <Head :title="t('logs.title')" />

  <div class="space-y-6">
    <h1 class="text-3xl font-bold text-center">{{ t('logs.title') }}</h1>

    <div>
      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title flex items-center gap-2">
            <DocumentTextIcon class="h-6 w-6" />
            {{ t('logs.files.title') }}
          </h2>

          <div v-if="loading" class="text-center py-4">
            <span class="loading loading-spinner loading-md"></span>
          </div>

          <div v-else-if="error" class="alert alert-error">
            <span>{{ error }}</span>
          </div>

          <div v-else class="grid md:grid-cols-2 gap-4">
            <ul class="bg-base-100 rounded-box mt-4 flex flex-col gap-2">
              <li v-for="file in infoLogs" :key="file.name">
                <button
                  @click="selectFile(file.name)"
                  :class="{ 'btn-primary': selectedFile === file.name }"
                  class="btn w-full"
                  style="
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    padding-top: 1.7rem;
                    padding-bottom: 1.7rem;
                  "
                >
                  <span class="font-medium">{{ file.name }}</span>
                  <span class="text-xs opacity-70">
                    {{ formatBytes(file.size) }} - {{ formatDate(file.modified) }}
                  </span>
                </button>
              </li>
            </ul>

            <ul class="bg-base-100 rounded-box mt-4 flex flex-col gap-2">
              <li v-for="file in errorLogs" :key="file.name">
                <button
                  @click="selectFile(file.name)"
                  :class="{ 'btn-primary': selectedFile === file.name }"
                  class="btn w-full"
                  style="
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    padding-top: 1.7rem;
                    padding-bottom: 1.7rem;
                  "
                >
                  <span class="font-medium">{{ file.name }}</span>
                  <span class="text-xs opacity-70">
                    {{ formatBytes(file.size) }} - {{ formatDate(file.modified) }}
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedFile">
      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title flex items-center gap-2">
            <CodeBracketIcon class="h-6 w-6" />
            {{ selectedFile || t('logs.viewer.noFileSelected') }}
          </h2>

          <div v-if="loadingContent" class="text-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else-if="parsedFileLogs.length > 0" class="mt-4">
            <div class="overflow-x-auto">
              <table class="table table-zebra table-xs">
                <thead>
                  <tr>
                    <th>{{ t('logs.table.time') }}</th>
                    <th>{{ t('logs.table.level') }}</th>
                    <th>{{ t('logs.table.pid') }}</th>
                    <th style="width: 230px">{{ t('logs.table.hostname') }}</th>
                    <th style="width: 230px">{{ t('logs.table.name') }}</th>
                    <th style="width: 350px">{{ t('logs.table.message') }}</th>
                    <th style="width: 230px">{{ t('logs.table.params') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(log, index) in paginatedFileLogs" :key="index">
                    <td class="whitespace-nowrap">{{ formatLogTime(log.time) }}</td>
                    <td>
                      <span
                        :class="getLogLevelClass(log.level)"
                        class="badge badge-sm font-semibold"
                      >
                        {{ getLogLevelText(log.level) }}
                      </span>
                    </td>
                    <td>{{ log.pid }}</td>
                    <td class="truncate" style="width: 230px; max-width: 230px">
                      {{ log.hostname }}
                    </td>
                    <td class="truncate" style="width: 230px; max-width: 230px">{{ log.name }}</td>
                    <td style="width: 350px; max-width: 350px">
                      <div class="whitespace-pre-wrap break-words">{{ log.msg }}</div>
                      <div v-if="log.err" class="text-xs opacity-70 mt-1">
                        <details class="collapse collapse-arrow bg-base-300">
                          <summary class="collapse-title text-xs py-1 min-h-0">
                            {{ t('logs.table.errorDetails') }}
                          </summary>
                          <div class="collapse-content">
                            <pre class="text-xs">{{ formatError(log.err) }}</pre>
                          </div>
                        </details>
                      </div>
                    </td>
                    <td class="truncate" style="width: 230px; max-width: 230px">
                      <details
                        v-if="log.params && Object.keys(log.params).length !== 0"
                        class="collapse collapse-arrow bg-base-300"
                      >
                        <summary class="collapse-title text-xs py-1 min-h-0">
                          {{ t('logs.table.params') }}
                        </summary>
                        <div class="collapse-content">
                          <pre class="text-xs">{{ log.params }}</pre>
                        </div>
                      </details>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex justify-center mt-4">
              <div class="join">
                <button
                  @click="previousPage"
                  :disabled="currentPage === 1"
                  class="join-item btn btn-sm"
                >
                  «
                </button>
                <button class="join-item btn btn-sm">
                  Page {{ currentPage }} / {{ totalPages }}
                </button>
                <button
                  @click="nextPage"
                  :disabled="currentPage === totalPages"
                  class="join-item btn btn-sm"
                >
                  »
                </button>
              </div>
            </div>
          </div>

          <div v-else class="flex items-center justify-center flex-col py-8 opacity-50">
            <DocumentTextIcon class="h-5 w-5 mb-2" />
            <p>{{ t('logs.viewer.selectFile') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card bg-base-200">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h2 class="card-title flex items-center gap-2">
            <SignalIcon class="h-6 w-6" />
            {{ t('logs.live.title') }}
          </h2>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-success animate-pulse"></div>
            <span class="text-sm opacity-50">{{ t('logs.live.realtime') }}</span>
          </div>
        </div>

        <div class="mt-4 overflow-x-auto max-h-[400px] overflow-y-auto" ref="liveLogsContainer">
          <div v-if="liveLogs.length === 0" class="text-center py-8 opacity-50">
            {{ t('logs.live.waiting') }}
          </div>
          <table v-else class="table table-zebra table-xs table-pin-rows">
            <thead>
              <tr>
                <th>{{ t('logs.table.time') }}</th>
                <th>{{ t('logs.table.level') }}</th>
                <th>{{ t('logs.table.pid') }}</th>
                <th style="width: 230px">{{ t('logs.table.hostname') }}</th>
                <th style="width: 230px">{{ t('logs.table.name') }}</th>
                <th style="width: 350px">{{ t('logs.table.message') }}</th>
                <th style="width: 230px">{{ t('logs.table.params') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(log, index) in liveLogs" :key="index">
                <td class="whitespace-nowrap">{{ formatLogTime(log.time) }}</td>
                <td>
                  <span :class="getLogLevelClass(log.level)" class="badge badge-sm font-semibold">
                    {{ getLogLevelText(log.level) }}
                  </span>
                </td>
                <td>{{ log.pid }}</td>
                <td class="truncate" style="width: 230px; max-width: 230px">{{ log.hostname }}</td>
                <td class="truncate" style="width: 230px; max-width: 230px">{{ log.name }}</td>
                <td style="width: 350px; max-width: 350px">
                  <div class="whitespace-pre-wrap break-words">{{ log.msg }}</div>
                  <div v-if="log.err" class="text-xs opacity-70 mt-1">
                    <details class="collapse collapse-arrow bg-base-300">
                      <summary class="collapse-title text-xs py-1 min-h-0">
                        {{ t('logs.table.errorDetails') }}
                      </summary>
                      <div class="collapse-content">
                        <pre class="text-xs">{{ formatError(log.err) }}</pre>
                      </div>
                    </details>
                  </div>
                </td>
                <td class="truncate" style="width: 230px; max-width: 230px">
                  <details
                    v-if="log.params && Object.keys(log.params).length !== 0"
                    class="collapse collapse-arrow bg-base-300"
                  >
                    <summary class="collapse-title text-xs py-1 min-h-0">
                      {{ t('logs.table.params') }}
                    </summary>
                    <div class="collapse-content">
                      <pre class="text-xs">{{ log.params }}</pre>
                    </div>
                  </details>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex gap-2 mt-4">
          <button @click="clearLiveLogs" class="btn btn-sm btn-ghost">
            {{ t('logs.live.clear') }}
          </button>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="autoScroll" class="checkbox checkbox-sm" />
            <span class="text-sm">{{ t('logs.live.autoScroll') }}</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Head } from '@inertiajs/vue3'
import { ref, onMounted, nextTick, computed } from 'vue'
import { DocumentTextIcon, CodeBracketIcon, SignalIcon } from '@heroicons/vue/24/outline'
import { useSSESubscription } from '~/composables/useSSESubscription'
import { useI18n } from 'vue-i18n'

interface LogFile {
  name: string
  size: number
  modified: string
}

interface SystemLog {
  level: number
  time: number
  pid: number
  hostname: string
  msg: string
  name?: string
  err?: any
  params?: Record<string, any>
}

const { t } = useI18n()

const logFiles = ref<LogFile[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const selectedFile = ref<string | null>(null)
const fileContent = ref<string | null>(null)
const parsedFileLogs = ref<SystemLog[]>([])
const loadingContent = ref(false)
const liveLogs = ref<SystemLog[]>([])
const autoScroll = ref(true)
const liveLogsContainer = ref<HTMLElement | null>(null)

// Pagination for file logs
const currentPage = ref(1)
const itemsPerPage = ref(20)

// Computed properties for pagination
const totalPages = computed(() => {
  return Math.ceil(parsedFileLogs.value.length / itemsPerPage.value)
})

const paginatedFileLogs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return parsedFileLogs.value.slice(start, end)
})

// Pagination functions
function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

// Subscribe to live logs
const { onResult } = useSSESubscription<SystemLog>('system/log')

onResult((log) => {
  // Parse log if it's a string
  let parsedLog: SystemLog
  if (typeof log === 'string') {
    try {
      parsedLog = JSON.parse(log)
    } catch {
      // If parsing fails, create a basic log object
      parsedLog = {
        level: 30,
        time: Date.now(),
        pid: 0,
        hostname: '',
        msg: log,
      }
    }
  } else {
    parsedLog = log
  }

  const { level, time, pid, hostname, msg, name, err, ...params } = parsedLog

  const parsedLogFinal: SystemLog = {
    level: level ?? 30,
    time: time ?? Date.now(),
    pid: pid ?? 0,
    hostname: hostname ?? '',
    msg: msg ?? '',
    name: name ?? '',
    err: err ?? null,
    params,
  }

  liveLogs.value.push(parsedLogFinal)

  // Limit to last 100 logs
  if (liveLogs.value.length > 100) {
    liveLogs.value.shift()
  }

  // Auto scroll to bottom if enabled
  if (autoScroll.value) {
    nextTick(() => {
      scrollToBottom()
    })
  }
})

// Load log files list
async function loadLogFiles() {
  loading.value = true
  error.value = null

  try {
    const response = await fetch('/api/logs/files')
    if (!response.ok) {
      throw new Error('Failed to load log files')
    }
    logFiles.value = await response.json()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}

// Select and load a log file
async function selectFile(filename: string) {
  selectedFile.value = filename
  loadingContent.value = true
  fileContent.value = null
  parsedFileLogs.value = []
  currentPage.value = 1 // Reset pagination

  try {
    const response = await fetch(`/api/logs/files/${encodeURIComponent(filename)}`)
    if (!response.ok) {
      throw new Error('Failed to load log file')
    }
    const data = await response.json()
    fileContent.value = data.content

    // Parse log file content (each line is a JSON object)
    parseLogContent(data.content)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    loadingContent.value = false
  }
}

// Parse log file content
function parseLogContent(content: string) {
  const lines = content.split('\n').filter((line) => line.trim())

  parsedFileLogs.value = lines
    .map((line) => {
      try {
        return JSON.parse(line) as SystemLog
      } catch {
        // If parsing fails, return null
        return null
      }
    })
    .filter((log): log is SystemLog => log !== null)
    .map((log) => {
      // Ensure required fields are present
      const { level, time, pid, hostname, msg, name, err, ...params } = log

      return {
        level: level ?? 30,
        time: time ?? Date.now(),
        pid: pid ?? 0,
        hostname: hostname ?? '',
        msg: msg ?? '',
        name: name ?? '',
        err: err ?? null,
        params,
      }
    })
    .reverse() // Reverse to show most recent logs first
}

// Format error object
function formatError(err: any): string {
  if (typeof err === 'string') return err

  const parts: string[] = []
  if (err.type) parts.push(`Type: ${err.type}`)
  if (err.message) parts.push(`Message: ${err.message}`)
  if (err.stack) parts.push(`Stack:\n${err.stack}`)

  return parts.join('\n\n')
}

// Clear live logs
function clearLiveLogs() {
  liveLogs.value = []
}

// Scroll to bottom of live logs
function scrollToBottom() {
  if (liveLogsContainer.value) {
    liveLogsContainer.value.scrollTop = liveLogsContainer.value.scrollHeight
  }
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format date
function formatDate(date: string): string {
  return new Date(date).toLocaleString()
}

// Format log time
function formatLogTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

// Get log level text
function getLogLevelText(level: number): string {
  const levels: Record<number, string> = {
    10: 'TRACE',
    20: 'DEBUG',
    30: 'INFO',
    40: 'WARN',
    50: 'ERROR',
    60: 'FATAL',
  }
  return levels[level] || 'UNKNOWN'
}

// Get log level CSS class
function getLogLevelClass(level: number): string {
  if (level >= 50) return 'text-error'
  if (level >= 40) return 'text-warning'
  if (level >= 30) return 'text-info'
  return 'text-success'
}

onMounted(() => {
  loadLogFiles()
})

const infoLogs = computed(() => {
  return logFiles.value.filter((file) => !file.name.includes('error'))
})

const errorLogs = computed(() => {
  return logFiles.value.filter((file) => file.name.includes('error'))
})
</script>
