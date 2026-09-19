import './style.css'
import * as THREE from 'three'
import { createStage } from './render/scene.ts'
import { rulingMaterial } from './render/materials.ts'
import { columnMetrics } from './geometry/column.ts'
import { buildBay, defaultBay, type Bay, type BayParams } from './plan/bay.ts'
import {
  buildHyperboloidRulings,
  buildHyperboloidSurface,
  defaultHyperboloid,
  type HyperboloidParams,
} from './geometry/hyperboloid.ts'
import { FreeCamera } from './camera/freecam.ts'
import { PhotoOverlay } from './dev/overlay.ts'
import { buildPanel, type RenderFlags, type SunFlags, type ViewFlags } from './dev/params.ts'
import { VIEWPOINTS, applyViewpoint } from './dev/viewpoints.ts'
import {
  BUILDING_BEARING_DEG,
  barcelonaTime,
  dayLabel,
  isSummerTime,
  solarPosition,
  sunDirection,
  type SolarPosition,
} from './light/sun.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#view')!
const overlayImg = document.querySelector<HTMLImageElement>('#overlay')!
const stageEl = document.querySelector<HTMLDivElement>('#stage')!
const hudEl = document.querySelector<HTMLDivElement>('#hud')!
const reticle = document.querySelector<HTMLDivElement>('#reticle')!

/** Width reserved for the parameter panel so it never covers the render. */
const PANEL_GUTTER = 310
/** The funnel's lower rim sits at this height, so tuning z doesn't move it. */
const FUNNEL_BASE_HEIGHT = 2.6
/** Keeps the funnel clear of the tree while both are on screen. */
const FUNNEL_OFFSET_X = 16

const stage = createStage(canvas)
const cam = new FreeCamera(stage.camera, canvas)
const overlay = new PhotoOverlay(overlayImg, document.body)

const bay: BayParams = structuredClone(defaultBay)
const hyper: HyperboloidParams = { ...defaultHyperboloid }
const view: ViewFlags = {
  showSurface: false,
  wireframe: false,
  showRulings: false,
  rulingCount: 48,
  rulingFamily: 'both',
  showFigure: true,
  showGround: true,
}
const render: RenderFlags = {
  exposure: 1,
  // Low on purpose. An environment probe lights the interior as if the walls
  // were not there, and every point of ambient it adds is a point of contrast
  // taken off the sun shafts, which are the entire subject.
  // Measured, not guessed: at these two numbers the shadowed floor sits at
  // 0.15 of the open-sun floor, which is about what a clear day gives, and a
  // shaft through the red glazing lands red rather than pink.
  environment: 0.18,
  glassGain: 3.4,
  bounce: 0.42,
  sunOffset: 0.06,
}

/**
 * Late September, four in the afternoon — the hour the sun stands square on
 * the Passion wall at an altitude low enough to throw the shafts right across
 * the bay. Found by scanning, not guessed.
 */
const sun: SunFlags = {
  dayOfYear: 262,
  hour: 16,
  bearingDeg: BUILDING_BEARING_DEG,
  intensity: 1,
  skyBrightness: 1,
}

/** Any year does; the sun repeats to well inside a pixel. */
const YEAR = 2026

// One material across the whole assembly: the plaster maquette has no material
// variation to budget for, which is the point of choosing it.
const plaster = stage.plaster

const bayRoot = new THREE.Group()
stage.scene.add(bayRoot)
let built: Bay | null = null

// Generators work in their natural frame with z as the axis; the world is
// y-up. Placement rotates, the mathematics stays clean.
const funnel = new THREE.Group()
funnel.rotation.x = -Math.PI / 2
funnel.position.x = FUNNEL_OFFSET_X
stage.scene.add(funnel)

const surface = new THREE.Mesh(buildHyperboloidSurface(hyper), plaster)
surface.castShadow = true
surface.receiveShadow = true
funnel.add(surface)

const rulings = new THREE.LineSegments(
  buildHyperboloidRulings(hyper, view.rulingCount, view.rulingFamily),
  rulingMaterial(),
)
funnel.add(rulings)

function rebuildBay(): void {
  if (built) {
    bayRoot.remove(built.group)
    for (const geometry of built.geometries) geometry.dispose()
  }
  built = buildBay(bay, plaster, stage.glass)
  bayRoot.add(built.group)

  // The sun rig fits itself to what is actually built, so it has to be told.
  built.group.updateMatrixWorld(true)
  stage.setModelBounds(new THREE.Box3().setFromObject(built.group))
}

function rebuild(): void {
  rebuildBay()

  surface.geometry.dispose()
  surface.geometry = buildHyperboloidSurface(hyper)

  rulings.geometry.dispose()
  rulings.geometry = buildHyperboloidRulings(hyper, view.rulingCount, view.rulingFamily)

  funnel.position.y = FUNNEL_BASE_HEIGHT - hyper.zBottom
  applyView()
}

function applyView(): void {
  surface.visible = view.showSurface
  rulings.visible = view.showRulings
  plaster.wireframe = view.wireframe
  stage.figure.visible = view.showFigure
  stage.ground.visible = view.showGround
}

function applyRender(): void {
  stage.setExposure(render.exposure)
  stage.scene.environmentIntensity = render.environment
  stage.glass.uniforms.uGlow.value = render.glassGain
  stage.bounce.intensity = render.bounce
  stage.sun.offset = render.sunOffset
  stage.invalidateSun()
}

let solar: SolarPosition = solarPosition(barcelonaTime(YEAR, sun.dayOfYear, sun.hour))

function applySun(): void {
  stage.sky.brightness = sun.skyBrightness
  const when = barcelonaTime(YEAR, sun.dayOfYear, sun.hour)
  solar = solarPosition(when)
  stage.setSun(sunDirection(solar, sun.bearingDeg))
  stage.sun.uniforms.uSunRadiance.value.multiplyScalar(sun.intensity)
}

function layout(): void {
  const availW = Math.max(240, window.innerWidth - PANEL_GUTTER)
  const availH = window.innerHeight
  let w = availW
  let h = availH

  // Letterbox the render to the photo's aspect. Without this a 3:2 reference
  // can never be matched inside a 16:9 viewport, however good the camera is.
  const lock = overlay.lockAspect && overlay.aspect
  if (lock) {
    const aspect = overlay.aspect as number
    if (availW / availH > aspect) w = Math.round(availH * aspect)
    else h = Math.round(availW / aspect)
  }

  stageEl.classList.toggle('locked', Boolean(lock))
  stageEl.style.left = `${Math.round((availW - w) / 2)}px`
  stageEl.style.top = `${Math.round((availH - h) / 2)}px`
  stageEl.style.width = `${w}px`
  stageEl.style.height = `${h}px`

  stage.resize(w, h)
  cam.setViewportSize(w, h)
  cam.refresh()
}

overlay.onChange = layout
window.addEventListener('resize', layout)

function goTo(index: number): void {
  const viewpoint = VIEWPOINTS[index]
  if (viewpoint) applyViewpoint(viewpoint, cam, sun, applySun)
}

buildPanel({
  bay, hyper, view, render, sun, cam, overlay,
  rebuild, applyView, applyRender, applySun, goTo,
})

// Number keys jump to the curated views, which is how the same six frames get
// compared after a change.
window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const index = VIEWPOINTS.findIndex((v) => v.key === event.key)
  if (index >= 0) goTo(index)
})

rebuild()
applyRender()
applySun()
layout()

// Open standing in the bay looking up, which is the whole point of the space.
goTo(0)

// Dev convenience: drive the harness from the console and from automated
// checks. Never referenced by the app itself.
declare global {
  interface Window {
    harness: {
      cam: FreeCamera
      overlay: PhotoOverlay
      bay: BayParams
      built: () => Bay | null
      hyper: HyperboloidParams
      view: ViewFlags
      render: RenderFlags
      sun: SunFlags
      solar: () => SolarPosition
      stage: typeof stage
      rebuild: () => void
      applySun: () => void
      applyRender: () => void
      goTo: (index: number) => void
    }
  }
}
window.harness = {
  cam,
  overlay,
  bay,
  built: () => built,
  hyper,
  view,
  render,
  sun,
  solar: () => solar,
  stage,
  rebuild,
  applySun,
  applyRender,
  goTo,
}

const clock = new THREE.Clock()
let hudAt = 0

function frame(): void {
  requestAnimationFrame(frame)
  const dt = Math.min(clock.getDelta(), 0.1)

  cam.update(dt)
  stage.render()

  reticle.classList.toggle('on', cam.isLocked)

  const now = performance.now()
  if (now - hudAt > 120) {
    hudAt = now
    const p = stage.camera.position
    const cm = columnMetrics(bay.tree.order)

    let tris = (surface.geometry.index?.count ?? 0) / 3
    let meshes = 1
    built?.group.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      meshes++
      tris += (node.geometry.index?.count ?? 0) / 3
    })

    hudEl.textContent = [
      `pos   ${p.x.toFixed(2)}  ${p.y.toFixed(2)}  ${p.z.toFixed(2)}`,
      `look  yaw ${deg(cam.yaw)}°   pitch ${deg(cam.pitch)}°`,
      `lens  ${stage.camera.fov.toFixed(1)}° fov   shift ${(cam.shiftCorrection * 100).toFixed(0)}%`,
      `move  ${cam.speed.toFixed(2)} m/s`,
      `mesh  ${Math.round(tris).toLocaleString()} tris  ${meshes} meshes  ` +
        `${(1 / Math.max(dt, 1e-4)).toFixed(0)} fps`,
      `trunk order ${cm.order}  ${cm.height} m  ⌀ ${cm.innerDiameter.toFixed(1)} m  ` +
        `${cm.polygonCount}×${cm.polygonSides}-gon`,
      `tree  ${bay.tree.levels} levels  ${bay.tree.branches} branches  ` +
        `springs at ${(built?.springHeight ?? 0).toFixed(1)} m`,
      `bay   ${bay.bay} m across  crown ${bay.vault.crownHeight} m  ` +
        `(${(bay.vault.crownHeight / 7.5).toFixed(0)} modules)`,
      `sun   ${dayLabel(YEAR, sun.dayOfYear)} ${wallClock(sun.hour)} ` +
        `${isSummerTime(barcelonaTime(YEAR, sun.dayOfYear, sun.hour)) ? 'CEST' : 'CET'}  ` +
        `alt ${deg(solar.altitude)}°  az ${deg(solar.azimuth)}°`,
    ].join('\n')
  }
}

function deg(radians: number): string {
  return ((radians * 180) / Math.PI).toFixed(1)
}

function wallClock(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

frame()
