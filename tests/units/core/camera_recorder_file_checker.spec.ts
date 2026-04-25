import { test } from '@japa/runner'
import CameraRecorderFileChecker from '#core/camera_recorder_file_checker'
import app from '@adonisjs/core/services/app'
import dayjs from 'dayjs'
import fs from 'node:fs/promises'

test.group('core - CameraRecorderFileChecker', () => {
  test('Should set isAlive false if the file was created more than 6 minutes ago', async ({
    assert,
  }) => {
    let results: boolean[] = []

    const folderPath = app.makePath('tests', 'units', 'stubs', 'folder-to-watch')
    const instance = new CameraRecorderFileChecker(folderPath, {
      interval: { runEvery: 200 },
      time: { initial: dayjs().subtract(7, 'minutes').toDate() },
    })
    instance.aliveListener = (isAlive) => {
      results.push(isAlive)
    }
    instance.start()

    await new Promise((resolve) => setTimeout(resolve, 200))

    // First is true by default when run start()
    assert.deepEqual(results, [true, false])
  })

  test('Should set isAlive true if the file was created less than 6 minutes ago', async ({
    assert,
  }) => {
    let results: boolean[] = []

    const folderPath = app.makePath('tests', 'units', 'stubs', 'folder-to-watch')
    const instance = new CameraRecorderFileChecker(folderPath, {
      interval: { runEvery: 200 },
      time: { initial: dayjs().subtract(3, 'minutes').toDate() },
    })
    instance.aliveListener = (isAlive) => {
      results.push(isAlive)
    }
    instance.start()

    await new Promise((resolve) => setTimeout(resolve, 200))

    // First is true by default when run start()
    assert.deepEqual(results, [true, true])
  })

  test('Should set isAlive true if the file because new file created in end', async ({
    assert,
  }) => {
    let results: boolean[] = []

    const folderPath = app.makePath('tests', 'units', 'stubs', 'folder-to-watch')
    const instance = new CameraRecorderFileChecker(folderPath, {
      interval: { runEvery: 200 },
      time: { initial: dayjs().subtract(7, 'minutes').toDate() },
    })
    instance.aliveListener = (isAlive) => {
      results.push(isAlive)
    }
    instance.start()

    await new Promise((resolve) => setTimeout(resolve, 200))

    await fs.writeFile(
      app.makePath('tests', 'units', 'stubs', 'folder-to-watch', 'test-file.txt'),
      'Hello'
    )

    await new Promise((resolve) => setTimeout(resolve, 200))

    assert.deepEqual(results, [true, false, true])
  })
})
