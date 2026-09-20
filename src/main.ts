import './style.css'
import * as THREE from 'three'
import { createStage } from './render/scene.ts'
import { rulingMaterial } from './render/materials.ts'
import { defaultShafts } from './render/shafts.ts'
import { columnMetrics } from './geometry/column.ts'
import { buildChurch, defaultChurch, type Church, type ChurchParams } from './plan/church.ts'
import { tunePaving } from './plan/floor.ts'
import {
  buildHyperboloidRulings,
  buildHyperboloidSurface,
  defaultHyperboloid,
  type HyperboloidParams,
} from './geometry/hyperboloid.ts'
import { FreeCamera } from './camera/freecam.ts'
import { TouchControls } from './camera/touch.ts'
import { PhotoOverlay } from './dev/overlay.ts'
import { censusFrame, type FrameCensus } from './dev/probe.ts'
import { buildPanel, type RenderFlags, type SunFlags, type ViewFlags } from './dev/params.ts'
import { VIEWPOINTS, applyViewpoint } from './dev/viewpoints.ts'
import { ShareLink } from './share.ts'
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
/**
 * Below this the panel stops being given room of its own and floats, closed,
 * over the top corner. Three hundred and ten pixels of gutter on a phone is
 * most of the phone.
 */
const NARROW = 820
/** The funnel's lower rim sits at this height, so tuning z doesn't move it. */
const FUNNEL_BASE_HEIGHT = 2.6
/** Keeps the funnel clear of the tree while both are on screen. */
const FUNNEL_OFFSET_X = 16

const stage = createStage(canvas)
const cam = new FreeCamera(stage.camera, canvas)
// Bound to the stage rather than the canvas, so the stick can be drawn in it.
new TouchControls(stageEl, cam)
const overlay = new PhotoOverlay(overlayImg, document.body)

const plan: ChurchParams = structuredClone(defaultChurch)
const hyper: HyperboloidParams = { ...defaultHyperboloid }
const view: ViewFlags = {
  showSurface: false,
  wireframe: false,
  showRulings: false,
  rulingCount: 48,
  rulingFamily: 'both',
  showFigure: true,
  showGround: true,
  detailLevel: -1,
  detailRange: 1,
}
const render: RenderFlags = {
  exposure: 1,
  // Low on purpose. An environment probe lights the interior as if the walls
  // were not there, and every point of ambient it adds is a point of contrast
  // taken off the sun shafts, which are the entire subject.
  // Measured, not guessed: at these two numbers the shadowed floor sits at
  // 0.15 of the open-sun floor, which is about what a clear day gives, and a
  // shaft through the red glazing lands red rather than pink.
  environment: 0.24,
  glassGain: 3.4,
  bounce: 0.5,
  sunOffset: 0.06,
  // White plaster under a uniform probe has almost no shading of its own, so
  // this is not a subtle effect here — it is most of the form in the vaults.
  // Two and a half metres is the scale of the crevices between them.
  occlusion: 0.6,
  occlusionRadius: 3,
  // The air. Every photograph of this interior is a photograph of air, and
  // until now the model had none — see render/shafts.ts.
  shafts: { ...defaultShafts },
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

const churchRoot = new THREE.Group()
stage.scene.add(churchRoot)
let built: Church | null = null

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

function rebuildChurch(): void {
  if (built) {
    churchRoot.remove(built.group, built.field.group)
    for (const geometry of built.geometries) geometry.dispose()
    const seat = stage.passes.indexOf(built.field)
    if (seat >= 0) stage.passes.splice(seat, 1)
    built.field.dispose()
  }
  built = buildChurch(plan, plaster, stage.glass, stage.paving)
  churchRoot.add(built.group, built.field.group)

  // The pattern is set out on the plan, not on the pavement, so it has to be
  // told where the apse turns it polar and where the crossing's roundel is.
  tunePaving(stage.pavingUniforms, plan.floor, built.paving)
  stage.setGroundLevel(plan.floor.show ? -plan.floor.podium : 0)
  // The field picks its level of detail once per pass, so the stage has to
  // know it exists.
  stage.passes.push(built.field)

  // The sun rig fits itself to what is actually built, so it has to be told.
  // Instanced pieces are invisible to Box3.setFromObject, which reads a
  // geometry's own bounds and not where its copies stand, so the plan reports
  // what it occupies rather than the scene graph being asked.
  // The roof over a room is the vault, not the tower standing on it.
  stage.setModelBounds(built.bounds, built.ceiling + plan.shell.parapet + 3)
  cam.envelope = built.envelope
}

function rebuild(): void {
  rebuildChurch()

  surface.geometry.dispose()
  surface.geometry = buildHyperboloidSurface(hyper)

  rulings.geometry.dispose()
  rulings.geometry = buildHyperboloidRulings(hyper, view.rulingCount, view.rulingFamily)

  funnel.position.y = FUNNEL_BASE_HEIGHT - hyper.zBottom
  applyView()
}

function applyView(): void {
  if (built) {
    built.field.forceLevel = view.detailLevel
    built.field.switchScale = view.detailRange
  }
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
  stage.setOcclusion({ intensity: render.occlusion, radius: render.occlusionRadius })
  stage.setShafts(render.shafts)
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
  const narrow = window.innerWidth < NARROW
  const availW = Math.max(240, window.innerWidth - (narrow ? 0 : PANEL_GUTTER))
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

/**
 * The address bar is the save format.
 *
 * Nothing about this building's light is authored, so a moment of it is
 * entirely described by where the camera stands and what the clock says —
 * see share.ts.
 */
const link = new ShareLink(
  () => ({ camera: cam.getState(), day: sun.dayOfYear, hour: sun.hour }),
  (moment) => {
    cam.setState(moment.camera)
    sun.dayOfYear = moment.day
    sun.hour = moment.hour
    applySun()
    cam.refresh()
    panel.refresh()
  },
)
link.bind()

const panel = buildPanel({
  plan, hyper, view, render, sun, cam, overlay,
  rebuild, applyView, applyRender, applySun, goTo,
  copyLink: () => void link.copy(),
})

// Number and letter keys jump to the curated views, which is how the same
// frames get compared after a change. The digits ran out at ten, and phase 4
// needed the outside of the building in the harness.
window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  // A panel field has the focus: these are characters, not shortcuts.
  if (event.target instanceof HTMLInputElement) return
  if (event.key === 'l' || event.key === 'L') {
    void link.copy()
    return
  }
  const index = VIEWPOINTS.findIndex((v) => v.key === event.key)
  if (index >= 0) goTo(index)
})

rebuild()
applyRender()
applySun()
// A phone opens on the building, not on the instrument panel.
panel.expanded = window.innerWidth >= NARROW
layout()

// A link decides where we open, and otherwise we open standing in the bay
// looking up, which is the whole point of the space.
if (!link.restore()) goTo(0)

// Dev convenience: drive the harness from the console and from automated
// checks. Never referenced by the app itself.
declare global {
  interface Window {
    harness: {
      cam: FreeCamera
      overlay: PhotoOverlay
      plan: ChurchParams
      built: () => Church | null
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
      /** What is in this frame, by surface — see dev/probe.ts. */
      census: () => FrameCensus | null
    }
  }
}
window.harness = {
  cam,
  overlay,
  plan,
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
  census: () => (built ? censusFrame(stage, [built.field.group]) : null),
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
  link.update(now)
  if (now - hudAt > 120) {
    hudAt = now
    const p = stage.camera.position
    const nave = plan.bands[0]!
    const cm = columnMetrics(nave.order)
    const apse = plan.apse

    const field = built?.field.stats() ?? { pieces: 0, triangles: 0, draws: 0 }
    let tris = field.triangles
    let draws = field.draws
    if (surface.visible) {
      tris += (surface.geometry.index?.count ?? 0) / 3
      draws++
    }
    built?.group.traverse((node: THREE.Object3D) => {
      if (!(node instanceof THREE.Mesh)) return
      draws++
      tris += (node.geometry.index?.count ?? 0) / 3
    })

    hudEl.textContent = [
      `pos   ${p.x.toFixed(2)}  ${p.y.toFixed(2)}  ${p.z.toFixed(2)}`,
      `look  yaw ${deg(cam.yaw)}°   pitch ${deg(cam.pitch)}°`,
      `lens  ${stage.camera.fov.toFixed(1)}° fov   shift ${(cam.shiftCorrection * 100).toFixed(0)}%`,
      `move  ${modeLabel()}  ${cam.speed.toFixed(2)} m/s fly  ` +
        `${cam.walkSpeed.toFixed(2)} m/s walk`,
      `mesh  ${Math.round(tris).toLocaleString()} tris  ${draws} draws  ` +
        `${field.pieces} pieces  ${(1 / Math.max(dt, 1e-4)).toFixed(0)} fps`,
      `trunk order ${cm.order}  ${cm.height} m  ⌀ ${cm.innerDiameter.toFixed(1)} m  ` +
        `${cm.polygonCount}×${cm.polygonSides}-gon`,
      `tree  ${nave.levels} levels  ${plan.tree.branches} branches  taper ${plan.tree.taper}  ` +
        `springs at ${(built?.springs ?? []).map((v) => v.toFixed(1)).join(' / ')} m`,
      `plan  ${plan.naveBays} × ${plan.station} m nave  ${plan.crossing.span} m crossing  ` +
        `${(apse.radius * 2).toFixed(0)} m apse  ` +
        `${(built?.halfWidth ?? 0).toFixed(1)} m half-width  ` +
        `${built?.arm ? `${(built.arm.halfWidth * 2).toFixed(1)} m across the transept` : 'no arms'}`,
      `vault ${plan.bands.map((b) => b.crown).join(' / ')} nave  ` +
        `${plan.crossing.armCrown} / ${plan.crossing.crown} crossing  ` +
        `${apse.ambulatoryCrown} / ${apse.crown} apse  m`,
      `floor ${plan.floor.slab.toFixed(2)} m slabs on the ${plan.station} m module  ` +
        `${apse.platform.height} m presbytery up ${apse.platform.risers} risers  ` +
        `${plan.floor.podium} m podium`,
      `shell ${(built?.towers.length ?? 0)} towers  ` +
        `${towerRange(built)}  ` +
        `peak ${(built?.peak ?? 0).toFixed(1)} m  ` +
        `${plan.shell.parapet} m parapet`,
      `air   ${render.shafts.density.toFixed(3)} scatter/m  ` +
        `g ${render.shafts.anisotropy.toFixed(2)}  ${render.shafts.range} m reach  ` +
        `${Math.round(render.shafts.steps)} samples/ray`,
      `sun   ${dayLabel(YEAR, sun.dayOfYear)} ${wallClock(sun.hour)} ` +
        `${isSummerTime(barcelonaTime(YEAR, sun.dayOfYear, sun.hour)) ? 'CEST' : 'CET'}  ` +
        `alt ${deg(solar.altitude)}°  az ${deg(solar.azimuth)}°`,
    ].join('\n')
  }
}

/** The shortest and tallest of the eighteen, which is how they are published. */
function towerRange(church: Church | null): string {
  const tops = (church?.towers ?? []).map((t) => t.top)
  if (tops.length === 0) return 'none'
  return `${Math.min(...tops).toFixed(1)}–${Math.max(...tops).toFixed(1)} m`
}

/** What the camera is currently doing, and how far through it is. */
function modeLabel(): string {
  const mode = cam.mode
  if (mode === 'settling') return `settling ${(cam.grounded * 100).toFixed(0)}%`
  return mode === 'walk' ? 'walking' : 'flying'
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
