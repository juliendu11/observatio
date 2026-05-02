import os from 'node:os'
import { promisifyExec } from '#helpers/process_helper'

export interface SystemMetrics {
  cpu: {
    usage: number // Pourcentage d'utilisation CPU (0-100)
    cores: number
  }
  memory: {
    total: number // En bytes
    used: number // En bytes
    free: number // En bytes
    usagePercent: number // Pourcentage (0-100)
  }
  disk: {
    total: number // En bytes
    used: number // En bytes
    free: number // En bytes
    usagePercent: number // Pourcentage (0-100)
  }
}

export default class SystemMetricsService {
  private previousCpuUsage: { idle: number; total: number } | null = null

  async getMetrics(): Promise<SystemMetrics> {
    const [cpu, memory, disk] = await Promise.all([
      this.getCpuMetrics(),
      this.getMemoryMetrics(),
      this.getDiskMetrics(),
    ])

    return {
      cpu,
      memory,
      disk,
    }
  }

  async getCpuMetrics(): Promise<SystemMetrics['cpu']> {
    const cpus = os.cpus()
    const cores = cpus.length

    let idle = 0
    let total = 0

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        total += cpu.times[type as keyof typeof cpu.times]
      }
      idle += cpu.times.idle
    })

    let usage = 0

    if (this.previousCpuUsage) {
      const idleDelta = idle - this.previousCpuUsage.idle
      const totalDelta = total - this.previousCpuUsage.total
      usage = 100 - (100 * idleDelta) / totalDelta
    }

    this.previousCpuUsage = { idle, total }

    return {
      usage: Math.max(0, Math.min(100, usage)),
      cores,
    }
  }

  async getMemoryMetrics(): Promise<SystemMetrics['memory']> {
    const total = os.totalmem()
    const free = os.freemem()
    const used = total - free
    const usagePercent = (used / total) * 100

    return {
      total,
      used,
      free,
      usagePercent,
    }
  }

  async getDiskMetrics(): Promise<SystemMetrics['disk']> {
    try {
      const { stdout } = await promisifyExec('df -B1 / | tail -1')
      const parts = stdout.trim().split(/\s+/)

      const total = Number.parseInt(parts[1], 10)
      const used = Number.parseInt(parts[2], 10)
      const free = Number.parseInt(parts[3], 10)
      const usagePercent = Number.parseFloat(parts[4])

      return {
        total,
        used,
        free,
        usagePercent,
      }
    } catch (error) {
      return {
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0,
      }
    }
  }
}
