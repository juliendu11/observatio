import { test } from '@japa/runner'
import CameraRecorderHealthChecker from '#core/camera_recorder_health_checker'
import { createServer } from 'node:http'

test.group('core - CameraRecorderHealthChecker', () => {
  test('Should return false because no response', async ({ assert }) => {
    let results: boolean[] = []

    const url = 'http://localhost:8458'

    const instance = new CameraRecorderHealthChecker(url, {
      interval: { runEvery: 200 },
      connect: { timeout: 0.1 },
    })
    instance.aliveListener = (isAlive) => {
      results.push(isAlive)
    }
    instance.start()

    await new Promise((resolve) => setTimeout(resolve, 300))

    // First is true by default when run start()
    assert.deepEqual(results, [true, false])
  })

  test('Should return true because good response', async ({ assert }) => {
    let results: boolean[] = []

    const url = 'http://localhost:8458'

    const server = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Hello World!\n')
    })

    await new Promise((resolve) => {
      // starts a simple http server locally on port 3000
      server.listen(8458, '127.0.0.1', () => {
        resolve({})
      })
    })

    const instance = new CameraRecorderHealthChecker(url, {
      interval: { runEvery: 200 },
      connect: { timeout: 0.1 },
    })
    instance.aliveListener = (isAlive) => {
      results.push(isAlive)
    }
    instance.start()

    await new Promise((resolve) => setTimeout(resolve, 300))

    // First is true by default when run start()
    assert.deepEqual(results, [true, true])
  })
})
