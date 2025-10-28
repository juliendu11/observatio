import factory from '@adonisjs/lucid/factories'
import User from '#models/user'

export const UserFactory = factory
  .define(User, async ({ faker }) => {
    return {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 }),
      isManager: faker.datatype.boolean(),
      language: 'en',
      theme: 'light',
    }
  })
  .build()
