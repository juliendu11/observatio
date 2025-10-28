import factory from '@adonisjs/lucid/factories'
import Camera from '#models/camera'

export const CameraFactory = factory
  .define(Camera, async ({ faker }) => {
    return {
      label: faker.lorem.words(3),
      link: faker.internet.url(),
      resolution: '1920x1080',
    }
  })
  .build()
