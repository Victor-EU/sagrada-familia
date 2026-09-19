import type { CameraState } from '../camera/freecam.ts'
import type { HyperboloidParams } from '../geometry/hyperboloid.ts'

/**
 * A matched viewpoint and the geometry it was matched against, stored together.
 *
 * Parameters are the source of truth and meshes are derived, so a preset is the
 * unit of verified work: this camera, against that photograph, produced these
 * numbers. Export lifts them out of the browser and into source.
 */
export interface Preset {
  name: string
  camera: CameraState
  hyperboloid: HyperboloidParams
  savedAt: string
}

const KEY = 'sf3d.presets.v1'

export class PresetStore {
  list(): Preset[] {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as Preset[]) : []
    } catch {
      return []
    }
  }

  names(): string[] {
    return this.list().map((p) => p.name)
  }

  get(name: string): Preset | undefined {
    return this.list().find((p) => p.name === name)
  }

  save(preset: Preset): void {
    const all = this.list().filter((p) => p.name !== preset.name)
    all.push(preset)
    all.sort((a, b) => a.name.localeCompare(b.name))
    this.write(all)
  }

  remove(name: string): void {
    this.write(this.list().filter((p) => p.name !== name))
  }

  exportJson(): string {
    return JSON.stringify(this.list(), null, 2)
  }

  private write(all: Preset[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(all))
    } catch (err) {
      console.warn('preset store unavailable', err)
    }
  }
}
