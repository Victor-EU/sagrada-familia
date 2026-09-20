import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve, normalize } from 'node:path'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

/**
 * Frame grabs, straight to disk.
 *
 * Looking at this building is the whole job, and a screenshot taken through
 * whatever window happens to be in front is not a repeatable look: it carries
 * the window's aspect ratio, the pane's scaling, and it needs the pane to be
 * visible at all. This takes the frame from the renderer instead — the same
 * pixels the app drew — and writes it where it can be opened beside a
 * photograph of the real thing.
 *
 * Dev server only. It is not part of the build and there is nothing to ship.
 */
function frameGrabs(): Plugin {
  const root = resolve(process.cwd(), 'reference/.shots')
  return {
    name: 'sagrada-frame-grabs',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end('POST only')
        }
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', () => {
          void (async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString()) as {
                name?: string
                data?: string
              }
              const name = (body.name ?? 'frame').replace(/[^a-z0-9._-]/gi, '-')
              const file = normalize(resolve(root, `${name}.png`))
              // Never let a name climb out of the shots directory.
              if (!file.startsWith(root)) throw new Error('bad name')
              const b64 = (body.data ?? '').replace(/^data:image\/\w+;base64,/, '')
              await mkdir(dirname(file), { recursive: true })
              await writeFile(file, Buffer.from(b64, 'base64'))
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ ok: true, file }))
            } catch (err) {
              res.statusCode = 400
              res.end(String(err))
            }
          })()
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [frameGrabs()],
  server: {
    // Port comes from the environment so the harness never collides with
    // another project's dev server.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
  build: { target: 'es2022' },
})
