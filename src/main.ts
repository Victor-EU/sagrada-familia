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
import { censusFrame, censusLight, type FrameCensus, type LightCensus } from './dev/probe.ts'
import { buildPanel, type RenderFlags, type SunFlags, type ViewFlags } from './dev/params.ts'
import { VIEWPOINTS, applyViewpoint } from './dev/viewpoints.ts'
import { ShareLink } from './share.ts'
import { Journey } from './ui/journey.ts'
import { Chrome } from './ui/chrome.ts'
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

/**
 * Whether this is the instrument or the building.
 *
 * The parameter panel is the right interface for the person building the
 * model and the wrong one for anybody who came to look at it, so it is no
 * longer the default: `?dev` in the address, or the P key, brings it back
 * along with the readouts. Everything it controls still works and is still
 * bound; it is the wall of sliders next to a cathedral that has gone.
 */
let dev = new URLSearchParams(location.search).has('dev')

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
  // Low, and it stays low — the probe is Barcelona sky, so more of it is more
  // blue, and past about 0.5 the whole room goes pale and flat as everything
  // piles up at the top of the ACES curve where it desaturates toward white.
  // The room is not short of light. It is short of light the right colour,
  // which is what the ambient rotation in materials.ts supplies.
  //
  // Eight hundredths above the old figure, which is the least of the three
  // numbers that were keeping the interior brown — see `uRoomGain`.
  environment: 0.3,
  /**
   * The glazing has to overrun white — but only just.
   *
   * At 3.8, where this sat, every window in the building was four times over
   * the tone mapper's white point, and everything four times over white is
   * the same colour: white. The Nativity wall — Vila-Grau's greens and blues,
   * jittered pane by pane and graded as it climbs, which is the single most
   * carefully built thing in this model — was delivered as a luminous smear
   * with no panes and no colour in it, and the bloom then spread that smear
   * over the columns in front of it.
   *
   * Glass is not a light source. It is a filter with a light behind it, and
   * what makes it beautiful is that it is *darker* than the sun and coloured.
   * A little over white keeps the spill and the halo where the sun stands
   * square on a window; the rest of the wall stays glass.
   */
  glassGain: 1.7,
  // Cut hard, and deliberately. A hemisphere light fills a shaded face
  // regardless of whether that face can see any sky, which outdoors is a lie
  // that costs the whole building its modelling: at 0.6 the lit and unlit
  // faces of a tower came back the same value. Interiors get theirs back
  // through uRoomGain — see render/materials.ts.
  bounce: 0.16,
  sunOffset: 0.06,
  sunNear: true,
  // Stone under a nearly uniform probe has little shading of its own, so this
  // is not a subtle effect here — it is most of the form in the vaults.
  // Two and a half metres is the scale of the crevices between them.
  occlusion: 0.55,
  occlusionRadius: 3,
  // The spill off the glazing — see the bloom pass in render/scene.ts.
  // Threshold raised with the gain above: at 1.4 a window that no longer
  // overruns white by much was still mostly above the knee, and the bloom
  // put back the smear the gain had just taken out.
  bloom: { strength: 0.3, radius: 0.75, threshold: 1.75 },
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

// The stones. A piece asks for the one it is cut from; see render/materials.ts.
const stones = stage.stones

const churchRoot = new THREE.Group()
stage.scene.add(churchRoot)
let built: Church | null = null

// Generators work in their natural frame with z as the axis; the world is
// y-up. Placement rotates, the mathematics stays clean.
const funnel = new THREE.Group()
funnel.rotation.x = -Math.PI / 2
funnel.position.x = FUNNEL_OFFSET_X
stage.scene.add(funnel)

const surface = new THREE.Mesh(buildHyperboloidSurface(hyper), stones.vault)
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
  built = buildChurch(plan, stones, stage.glass, stage.paving)
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
  for (const material of Object.values(stones)) material.wireframe = view.wireframe
  stage.figure.visible = view.showFigure
  stage.ground.visible = view.showGround
}

function applyRender(): void {
  stage.setExposure(render.exposure)
  stage.scene.environmentIntensity = render.environment
  stage.glass.uniforms.uGlow.value = render.glassGain
  stage.bounce.intensity = render.bounce
  stage.sun.offset = render.sunOffset
  stage.setSunNear(render.sunNear)
  stage.setOcclusion({ intensity: render.occlusion, radius: render.occlusionRadius })
  stage.setBloom(render.bloom)
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
  const gutter = dev && !narrow ? PANEL_GUTTER : 0
  const availW = Math.max(240, window.innerWidth - gutter)
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
    panel?.refresh()
  },
)
link.bind()

type Panel = ReturnType<typeof buildPanel>
let panel: Panel | null = null

/** Build the instrument the first time it is actually asked for. */
function openPanel(): Panel {
  panel ??= buildPanel({
    plan, hyper, view, render, sun, cam, overlay,
    rebuild, applyView, applyRender, applySun, goTo,
    copyLink: () => void link.copy(),
  })
  return panel
}

function setDev(on: boolean): void {
  dev = on
  document.body.classList.toggle('dev', on)
  if (on) {
    const p = openPanel()
    p.expanded = window.innerWidth >= NARROW
  }
  const wrapper = document.querySelector<HTMLElement>('.tp-dfwv')
  if (wrapper) wrapper.style.display = on ? '' : 'none'
  layout()
}

/**
 * The visit.
 *
 * `goTo` above is the harness's way round the building — thirteen frames in
 * whatever order a regression wants them. This is a viewer's way round it,
 * which is a different thing and has to be in an order: across the plaza,
 * up to the front, onto the terraces, through the door, and then five stops
 * inside. See ui/journey.ts.
 */
const journey = new Journey(cam, sun, applySun)
const chrome = new Chrome(journey, document.body)
journey.onArrive = (moment, index) => {
  chrome.arrive(moment, index)
  chrome.setTravelling(false)
}
journey.onDepart = (moment, index) => chrome.depart(moment, index)

/**
 * Any movement of the viewer's own ends the tour where it stands.
 *
 * Stopping the flight is not enough on its own — the caption would go on
 * describing a place the camera has walked away from — so the chrome is told
 * as well, and offers the visit back rather than resuming it uninvited.
 */
const MOVEMENT = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyC',
  'ShiftLeft', 'ShiftRight',
])
/**
 * Looking is not leaving.
 *
 * A click used to end the visit, and a click is also the only way to capture
 * the pointer — so the first thing a viewer does on arriving at a stop, which
 * is look around it, silently threw away the tour they had just started. The
 * caption stayed up describing a place they were still standing in, and the
 * only clue was that the arrows had stopped meaning anything.
 *
 * Turning your head at a viewpoint is part of being at the viewpoint. What
 * ends the visit is going somewhere: the movement keys, or the wheel, which
 * is the speed control and therefore an intention to fly.
 */
canvas.addEventListener('wheel', () => chrome.takeOver(), { passive: true })

// Number and letter keys jump to the curated views, which is how the same
// frames get compared after a change. The digits ran out at ten, and phase 4
// needed the outside of the building in the harness.
window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  // A panel field has the focus: these are characters, not shortcuts.
  if (event.target instanceof HTMLInputElement) return

  if (MOVEMENT.has(event.code)) {
    chrome.takeOver()
    return
  }
  switch (event.key) {
    case 'ArrowRight':
      journey.next()
      return
    case 'ArrowLeft':
      journey.prev()
      return
    case 'f':
    case 'F':
      chrome.explore()
      return
    case 'p':
    case 'P':
      setDev(!dev)
      return
    case 'l':
    case 'L':
      void link.copy()
      return
    case 'Enter':
      chrome.begin()
      return
  }

  // The curated views are the regression harness, not the visit: they move
  // the camera without telling the chrome, so the caption would go on
  // describing somewhere else. They stay on the keys they have always been
  // on, behind the same switch as the panel.
  if (!dev) return
  const index = VIEWPOINTS.findIndex((v) => v.key === event.key)
  if (index >= 0) goTo(index)
})

rebuild()
applyRender()
applySun()
setDev(dev)

// A link decides where we open — someone was sent a moment and should land
// in it, not in a title card. Otherwise the title card, and the visit.
if (link.restore()) {
  chrome.explore()
} else {
  journey.jump(0)
}

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
      journey: Journey
      census: () => FrameCensus | null
      /** What the light is doing — see dev/probe.ts. */
      light: () => LightCensus
      /** Draw one frame and write it to `reference/.shots` — see vite.config.ts. */
      shot: (name: string, width?: number) => Promise<string>
    }
  }
}

/**
 * Take the frame the renderer just drew and send it to disk.
 *
 * The drawing buffer is not preserved between frames, so this renders and
 * reads in the same task — a frame drawn now and copied on the next tick
 * comes back blank. The copy goes through a 2D canvas so a full-resolution
 * frame can be written down to something an eye can take in at once.
 */
async function shot(name: string, width = 1400): Promise<string> {
  stage.render()
  const src = stage.renderer.domElement
  const scale = Math.min(1, width / src.width)
  const flat = document.createElement('canvas')
  flat.width = Math.round(src.width * scale)
  flat.height = Math.round(src.height * scale)
  flat.getContext('2d')!.drawImage(src, 0, 0, flat.width, flat.height)
  const res = await fetch('/__shot', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, data: flat.toDataURL('image/png') }),
  })
  return `${res.status} ${(await res.text()).slice(0, 120)}`
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
  journey,
  census: () => (built ? censusFrame(stage, [built.field.group]) : null),
  light: () => censusLight(stage),
  shot,
}

const clock = new THREE.Clock()
let hudAt = 0

function frame(): void {
  requestAnimationFrame(frame)
  const dt = Math.min(clock.getDelta(), 0.1)

  cam.update(dt)
  // After the camera's own update, so a frame in which both run ends with the
  // flight's answer rather than with whatever the idle walker did under it.
  journey.update(dt)
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
      `shadow ${shadowTexels()}`,
      `air   ${render.shafts.density.toFixed(3)} scatter/m  ` +
        `g ${render.shafts.anisotropy.toFixed(2)}  ${render.shafts.range} m reach  ` +
        `${Math.round(render.shafts.steps)} samples/ray`,
      `sun   ${dayLabel(YEAR, sun.dayOfYear)} ${wallClock(sun.hour)} ` +
        `${isSummerTime(barcelonaTime(YEAR, sun.dayOfYear, sun.hour)) ? 'CEST' : 'CET'}  ` +
        `alt ${deg(solar.altitude)}°  az ${deg(solar.azimuth)}°`,
    ].join('\n')
  }
}

/**
 * How much world one shadow texel covers, in each of the two maps.
 *
 * On the readout because it is the number that decides whether a branch's
 * shadow on a vault is a branch or a smudge, and because it moves: the wide
 * map is fitted to the model *and* the ground its shadow falls on, so a low
 * sun coarsens every shadow in the building and nothing else says so.
 */
function shadowTexels(): string {
  const { wide, near } = stage.sun.texelSize
  const cm = (m: number): string => `${(m * 100).toFixed(1)} cm`
  return render.sunNear
    ? `${cm(near)} near  ${cm(wide)} wide  ${(wide / near).toFixed(1)}× finer where you stand`
    : `${cm(wide)}  one map`
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
