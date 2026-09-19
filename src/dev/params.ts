import { Pane } from 'tweakpane'
import type { FolderApi } from 'tweakpane'
import type { FreeCamera } from '../camera/freecam.ts'
import type { NaveParams } from '../plan/nave.ts'
import type { HyperboloidParams, RulingFamily } from '../geometry/hyperboloid.ts'
import type { PhotoOverlay } from './overlay.ts'
import { PresetStore } from './presets.ts'
import { VIEWPOINTS } from './viewpoints.ts'

export interface ViewFlags {
  showSurface: boolean
  wireframe: boolean
  showRulings: boolean
  rulingCount: number
  rulingFamily: RulingFamily
  showFigure: boolean
  showGround: boolean
  /** Level of detail to pin every instance to; −1 chooses by distance. */
  detailLevel: number
  /** Multiplier on the distances at which detail drops. */
  detailRange: number
}

export interface RenderFlags {
  exposure: number
  environment: number
  /** How far past white the glass is driven before the tone mapper rolls it off. */
  glassGain: number
  /** Strength of the interreflection stand-in. */
  bounce: number
  /** Slope-scaled depth bias for the sun's occlusion pass, in metres. */
  sunOffset: number
}

/**
 * Where the sun is. Day and hour are Barcelona wall-clock; the bearing is the
 * building's, and is the one number here that is a measurement rather than a
 * taste.
 */
export interface SunFlags {
  dayOfYear: number
  hour: number
  bearingDeg: number
  intensity: number
  skyBrightness: number
}

export interface ParamContext {
  plan: NaveParams
  hyper: HyperboloidParams
  view: ViewFlags
  render: RenderFlags
  sun: SunFlags
  cam: FreeCamera
  overlay: PhotoOverlay
  /** Regenerate geometry from `hyper` and re-apply `view`. */
  rebuild(): void
  /** Push `view` flags onto existing objects without regenerating. */
  applyView(): void
  /** Push `render` flags onto the renderer and scene. */
  applyRender(): void
  /** Recompute the sun from `sun` and re-light. */
  applySun(): void
  /** Jump to a curated viewpoint by index. */
  goTo(index: number): void
}

export function buildPanel(ctx: ParamContext): Pane {
  const pane = new Pane({ title: 'Phase 0 harness' })
  const store = new PresetStore()

  const views = pane.addFolder({ title: 'Viewpoints' })
  for (const [index, viewpoint] of VIEWPOINTS.entries()) {
    views
      .addButton({ title: `${viewpoint.key} · ${viewpoint.name}` })
      .on('click', () => {
        ctx.goTo(index)
        pane.refresh()
      })
  }

  // One folder per band across the nave, because that is where the plan
  // actually varies: the order of a column is chosen by what it carries.
  for (const band of ctx.plan.bands) {
    const f = pane.addFolder({ title: band.name })
    f.addBinding(band, 'outer', { min: 3, max: 40, step: 0.25, label: 'line at ±x' })
    f.addBinding(band, 'crown', { min: 12, max: 80, step: 0.5, label: 'crown m' })
    f.addBinding(band, 'order', {
      label: 'order',
      options: { '6 — sandstone': 6, '8 — grey granite': 8, '10 — basalt': 10, '12 — porphyry': 12 },
    })
    f.addBinding(band, 'levels', { min: 0, max: 3, step: 1, label: 'branch levels' })
    f.addBinding(band, 'branchLength', { min: 0.1, max: 1.4, step: 0.01, label: 'branch length' })
    f.addBinding(band, 'skylight', { label: 'skylight' })
    f.on('change', () => ctx.rebuild())
  }

  const col = pane.addFolder({ title: 'Tree shape' })
  col.addBinding(ctx.plan.tree, 'branches', { min: 2, max: 6, step: 1, label: 'branches / knot' })
  col.addBinding(ctx.plan.tree, 'splayDeg', { min: 0, max: 60, step: 0.5, label: 'splay °' })
  col.addBinding(ctx.plan.tree, 'phaseDeg', { min: 0, max: 90, step: 1, label: 'fan phase °' })
  col.addBinding(ctx.plan.tree, 'knotRadiusScale', { min: 1, max: 2.5, step: 0.01, label: 'knot width' })
  col.addBinding(ctx.plan.tree, 'knotHeightScale', { min: 0.4, max: 2.5, step: 0.01, label: 'knot height' })
  col.addBinding(ctx.plan.tree, 'stages', { min: 1, max: 6, step: 1, label: 'twist stages' })
  col.on('change', () => ctx.rebuild())

  // Tessellation is no longer typed in here. Counts follow the size of the
  // feature — see geometry/detail.ts — so what is worth a dial is which level
  // gets used, and how far away the switch happens.
  const lod = pane.addFolder({ title: 'Detail' })
  lod.addBinding(ctx.view, 'detailLevel', {
    label: 'level',
    options: { auto: -1, '0 — near': 0, '1': 1, '2': 2, '3 — far': 3 },
  })
  lod.addBinding(ctx.view, 'detailRange', { min: 0.2, max: 4, step: 0.05, label: 'switch ×' })
  lod.on('change', () => ctx.applyView())

  const vault = pane.addFolder({ title: 'Plan and vault' })
  vault.addBinding(ctx.plan, 'bays', { min: 1, max: 12, step: 1, label: 'bays' })
  vault.addBinding(ctx.plan, 'station', { min: 5, max: 30, step: 0.25, label: 'bay length m' })
  vault.addBinding(ctx.plan.vault, 'skylightRadius', { min: 0.2, max: 5, step: 0.05, label: 'skylight r' })
  vault.addBinding(ctx.plan.vault, 'bossRadius', { min: 0.5, max: 8, step: 0.05, label: 'boss r' })
  vault.addBinding(ctx.plan.vault, 'meetFraction', { min: 0.15, max: 0.9, step: 0.01, label: 'meet height' })
  vault.addBinding(ctx.plan.vault, 'spread', { min: 0.8, max: 1.5, step: 0.01, label: 'overlap' })
  vault.on('change', () => ctx.rebuild())

  const walls = pane.addFolder({ title: 'Walls and glass' })
  walls.addBinding(ctx.plan.walls, 'show', { label: 'walls' })
  walls.addBinding(ctx.plan.walls, 'offset', { min: 0, max: 8, step: 0.05, label: 'outboard m' })
  walls.addBinding(ctx.plan.walls, 'thickness', { min: 0.2, max: 3, step: 0.05, label: 'thickness m' })
  walls.addBinding(ctx.plan.walls, 'lights', { min: 1, max: 6, step: 1, label: 'lights / register' })
  walls.addBinding(ctx.plan.walls, 'margin', { min: 0.2, max: 4, step: 0.05, label: 'end stone m' })
  walls.addBinding(ctx.plan.walls, 'mullion', { min: 0.1, max: 3, step: 0.05, label: 'mullion m' })
  walls.addBinding(ctx.plan.walls, 'clerestoryOffset', { min: 0.1, max: 3, step: 0.05, label: 'clerestory ±x' })
  walls.addBinding(ctx.plan.walls, 'lowSill', { min: 0, max: 20, step: 0.1, label: 'aisle sill m' })
  walls.addBinding(ctx.plan.walls, 'lowHead', { min: 2, max: 30, step: 0.1, label: 'aisle head m' })
  walls.addBinding(ctx.plan.walls, 'highSill', { min: 5, max: 36, step: 0.1, label: 'clerestory sill m' })
  walls.addBinding(ctx.plan.walls, 'highHead', { min: 6, max: 40, step: 0.1, label: 'clerestory head m' })
  walls.on('change', () => ctx.rebuild())

  const sun = pane.addFolder({ title: 'Sun' })
  sun.addBinding(ctx.sun, 'dayOfYear', { min: 1, max: 365, step: 1, label: 'day of year' })
  sun.addBinding(ctx.sun, 'hour', { min: 0, max: 24, step: 0.05, label: 'hour (local)' })
  sun.addBinding(ctx.sun, 'bearingDeg', { min: 0, max: 360, step: 0.5, label: 'apse bearing °' })
  sun.addBinding(ctx.sun, 'intensity', { min: 0, max: 4, step: 0.01, label: 'sun ×' })
  sun.addBinding(ctx.sun, 'skyBrightness', { min: 0, max: 3, step: 0.01, label: 'sky ×' })
  sun.on('change', () => ctx.applySun())

  const geo = pane.addFolder({ title: 'Hyperboloid (scratch)' })
  geo.addBinding(ctx.hyper, 'throatRadius', { min: 0.15, max: 6, step: 0.01, label: 'throat a' })
  geo.addBinding(ctx.hyper, 'ellipticity', { min: 0.3, max: 3, step: 0.01, label: 'b / a' })
  geo.addBinding(ctx.hyper, 'flare', { min: 0.2, max: 10, step: 0.01, label: 'flare c' })
  geo.addBinding(ctx.hyper, 'zBottom', { min: -20, max: 0, step: 0.05, label: 'z bottom' })
  geo.addBinding(ctx.hyper, 'zTop', { min: 0, max: 20, step: 0.05, label: 'z top' })
  geo.addBinding(ctx.hyper, 'radialSegments', { min: 8, max: 512, step: 1, label: 'radial' })
  geo.addBinding(ctx.hyper, 'heightSegments', { min: 2, max: 384, step: 1, label: 'height' })
  geo.on('change', () => ctx.rebuild())

  const view = pane.addFolder({ title: 'View' })
  view.addBinding(ctx.view, 'showSurface', { label: 'surface' })
  view.addBinding(ctx.view, 'wireframe', { label: 'wireframe' })
  view.addBinding(ctx.view, 'showRulings', { label: 'rulings' })
  view.addBinding(ctx.view, 'rulingCount', { min: 4, max: 200, step: 1, label: 'ruling count' })
  view.addBinding(ctx.view, 'rulingFamily', {
    label: 'family',
    options: { left: 'left', right: 'right', both: 'both' },
  })
  view.addBinding(ctx.view, 'showFigure', { label: '1.65 m figure' })
  view.addBinding(ctx.view, 'showGround', { label: 'ground' })
  view.on('change', () => ctx.rebuild())

  const cam = pane.addFolder({ title: 'Camera' })
  cam.addBinding(ctx.cam.camera, 'fov', { min: 12, max: 100, step: 0.1 })
    .on('change', () => ctx.cam.refresh())
  cam.addBinding(ctx.cam, 'shiftCorrection', {
    min: 0,
    max: 1,
    step: 0.01,
    label: 'vertical correction',
  }).on('change', () => ctx.cam.refresh())
  cam.addBinding(ctx.cam, 'speed', { min: 0.15, max: 400, step: 0.05, label: 'fly m/s' })
  cam.addBinding(ctx.cam, 'walkSpeed', { min: 0.4, max: 4, step: 0.05, label: 'walk m/s' })
  cam.addBinding(ctx.cam, 'grounding', { label: 'ground indoors' })
  cam.addButton({ title: 'Copy camera JSON' }).on('click', () => {
    void copy(JSON.stringify(ctx.cam.getState(), null, 2))
  })

  const ov = pane.addFolder({ title: 'Reference photo' })
  ov.addButton({ title: 'Load image…' }).on('click', () => ctx.overlay.pick())
  ov.addBinding(ctx.overlay, 'opacity', { min: 0, max: 1, step: 0.01 })
  ov.addBinding(ctx.overlay, 'visible', { label: 'show (O)' })
  ov.addBinding(ctx.overlay, 'difference', { label: 'difference (X)' })
  ov.addBinding(ctx.overlay, 'lockAspect', { label: 'letterbox to photo' })
  ov.addButton({ title: 'Clear' }).on('click', () => ctx.overlay.clear())

  const rnd = pane.addFolder({ title: 'Render' })
  rnd.addBinding(ctx.render, 'exposure', { min: 0.1, max: 3, step: 0.01 })
  rnd.addBinding(ctx.render, 'environment', { min: 0, max: 2, step: 0.01, label: 'ambient' })
  rnd.addBinding(ctx.render, 'glassGain', { min: 1, max: 12, step: 0.05, label: 'glass glow' })
  rnd.addBinding(ctx.render, 'bounce', { min: 0, max: 2, step: 0.01, label: 'bounce fill' })
  rnd.addBinding(ctx.render, 'sunOffset', { min: 0, max: 0.4, step: 0.005, label: 'shadow bias m' })
  rnd.on('change', () => ctx.applyRender())

  buildPresets(pane, ctx, store)
  return pane
}

function buildPresets(pane: Pane, ctx: ParamContext, store: PresetStore): void {
  const folder = pane.addFolder({ title: 'Presets' })
  const local = { name: 'view-1', load: '' }

  folder.addBinding(local, 'name', { label: 'name' })
  folder.addButton({ title: 'Save camera + params' }).on('click', () => {
    const name = local.name.trim()
    if (!name) return
    store.save({
      name,
      camera: ctx.cam.getState(),
      hyperboloid: { ...ctx.hyper },
      savedAt: new Date().toISOString(),
    })
    refreshList()
  })
  folder.addButton({ title: 'Delete named' }).on('click', () => {
    store.remove(local.name.trim())
    refreshList()
  })
  folder.addButton({ title: 'Export all to clipboard' }).on('click', () => {
    void copy(store.exportJson())
  })

  let listBinding: ReturnType<FolderApi['addBinding']> | null = null

  function refreshList(): void {
    listBinding?.dispose()
    const names = store.names()
    const options: Record<string, string> = names.length
      ? Object.fromEntries(names.map((n) => [n, n]))
      : { '(none saved)': '' }
    local.load = names.includes(local.load) ? local.load : (names[0] ?? '')

    listBinding = folder.addBinding(local, 'load', { label: 'recall', options })
    listBinding.on('change', () => {
      const preset = store.get(local.load)
      if (!preset) return
      Object.assign(ctx.hyper, preset.hyperboloid)
      ctx.cam.setState(preset.camera)
      local.name = preset.name
      ctx.rebuild()
      pane.refresh()
    })
  }

  refreshList()
}

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    console.info('copied to clipboard:\n' + text)
  } catch {
    console.info('clipboard unavailable, value follows:\n' + text)
  }
}
