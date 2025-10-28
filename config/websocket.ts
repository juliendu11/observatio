import env from '#start/env'
import { defineConfig } from 'adonisjs-websocket'

const websocketConfig = defineConfig({
  middleware: [
    () => import('@adonisjs/session/session_middleware'),
    () => import('#middleware/container_bindings_middleware'),
    () => import('#middleware/initialize_bouncer_middleware'),
    () => import('@adonisjs/auth/initialize_auth_middleware'),
  ],
  redis: {
    enabled: false,
    host: env.get('REDIS_HOST', 'localhost'),
    port: env.get('REDIS_PORT', 6379),
    password: env.get('REDIS_PASSWORD'),
  },
})

export default websocketConfig
