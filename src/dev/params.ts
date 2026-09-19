import { Pane } from 'tweakpane'
import type { FolderApi } from 'tweakpane'
import type { FreeCamera } from '../camera/freecam.ts'
import type { BayParams } from '../plan/bay.ts'
import type { HyperboloidParams, RulingFamily } from '../geometry/hyperboloid.ts'
import type { PhotoOverlay } from './overlay.ts'
import { PresetStore } from './presets.ts'

export interface ViewFlags {
  showSurface: boolean
  wireframe: boolean
  showRulings: boolean
  rulingCount: number
  rulingFamily: RulingFamily
  showFigure: boolean
  showGround: boolean
}

export interface RenderFlags {
  exposure: number
  environment: number
}

export interface ParamContext {
  bay: BayParams
  hyper: HyperboloidParams
  view: ViewFlags
  render: RenderFlags
  cam: FreeCamera
  overlay: PhotoOverlay
  /** Regenerate geometry from `hyper` and re-apply `view`. */
  rebuild(): void
  /** Push `view` flags onto existing objects without regenerating. */
  applyView(): void
  /** Push `render` flags onto the renderer and scene. */
  applyRender(): void
}

export function buildPanel(ctx: ParamContext): Pane {
  const pane = new Pane({ title: 'Phase 0 harness' })
  const store = new PresetStore()

  const col = pane.addFolder({ title: 'Tree column' })
  col.addBinding(ctx.bay.tree, 'order', {
    label: 'trunk order',
    options: { '6 — sandstone': 6, '8 — grey granite': 8, '10 — basalt': 10, '12 — porphyry': 12 },
  })
  col.addBinding(ctx.bay.tree, 'levels', { min: 0, max: 3, step: 1, label: 'branch levels' })
  col.addBinding(ctx.bay.tree, 'branches', { min: 2, max: 6, step: 1, label: 'branches / knot' })
  col.addBinding(ctx.bay.tree, 'splayDeg', { min: 0, max: 60, step: 0.5, label: 'splay °' })
  col.addBinding(ctx.bay.tree, 'phaseDeg', { min: 0, max: 90, step: 1, label: 'fan phase °' })
  col.addBinding(ctx.bay.tree, 'branchLength', { min: 0.1, max: 1, step: 0.01, label: 'branch length' })
  col.addBinding(ctx.bay.tree, 'knotRadiusScale', { min: 1, max: 2.5, step: 0.01, label: 'knot width' })
  col.addBinding(ctx.bay.tree, 'knotHeightScale', { min: 0.4, max: 2.5, step: 0.01, label: 'knot height' })
  col.addBinding(ctx.bay.tree, 'stages', { min: 1, max: 6, step: 1, label: 'twist stages' })
  col.addBinding(ctx.bay.tree, 'radialSegments', { min: 24, max: 512, step: 8, label: 'radial' })
  col.addBinding(ctx.bay.tree, 'heightSegments', { min: 8, max: 384, step: 4, label: 'height' })
  col.on('change', () => ctx.rebuild())

  const vault = pane.addFolder({ title: 'Bay and vault' })
  vault.addBinding(ctx.bay, 'bay', { min: 5, max: 30, step: 0.25, label: 'column spacing m' })
  vault.addBinding(ctx.bay.vault, 'crownHeight', { min: 15, max: 75, step: 0.5, label: 'crown m' })
  vault.addBinding(ctx.bay.vault, 'skylightRadius', { min: 0.2, max: 5, step: 0.05, label: 'skylight r' })
  vault.addBinding(ctx.bay.vault, 'bossRadius', { min: 0.5, max: 8, step: 0.05, label: 'boss r' })
  vault.addBinding(ctx.bay.vault, 'meetFraction', { min: 0.15, max: 0.9, step: 0.01, label: 'meet height' })
  vault.addBinding(ctx.bay.vault, 'spread', { min: 0.8, max: 1.5, step: 0.01, label: 'overlap' })
  vault.on('change', () => ctx.rebuild())

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
  cam.addBinding(ctx.cam, 'speed', { min: 0.15, max: 400, step: 0.05, label: 'speed m/s' })
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
