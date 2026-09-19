import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Port comes from the environment so the harness never collides with
    // another project's dev server.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
  build: { target: 'es2022' },
})
