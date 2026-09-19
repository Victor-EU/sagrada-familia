import './style.css'
import * as THREE from 'three'
import { createStage } from './render/scene.ts'
import { plasterMaterial, rulingMaterial } from './render/materials.ts'
import {
  buildColumn,
  columnMetrics,
  defaultColumn,
  type ColumnParams,
} from './geometry/column.ts'
import {
  buildHyperboloidRulings,
  buildHyperboloidSurface,
  defaultHyperboloid,
  type HyperboloidParams,
} from './geometry/hyperboloid.ts'
import { FreeCamera } from './camera/freecam.ts'
import { PhotoOverlay } from './dev/overlay.ts'
import { buildPanel, type RenderFlags, type ViewFlags } from './dev/params.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#view')!
const overlayImg = document.querySelector<HTMLImageElement>('#overlay')!
const stageEl = document.querySelector<HTMLDivElement>('#stage')!
const hudEl = document.querySelector<HTMLDivElement>('#hud')!
const reticle = document.querySelector<HTMLDivElement>('#reticle')!

/** Width reserved for the parameter panel so it never covers the render. */
const PANEL_GUTTER = 310
/** The funnel's lower rim sits at this height, so tuning z doesn't move it. */
const FUNNEL_BASE_HEIGHT = 2.6

const stage = createStage(canvas)
const cam = new FreeCamera(stage.camera, canvas)
const overlay = new PhotoOverlay(overlayImg, document.body)

const column: ColumnParams = { ...defaultColumn }
const hyper: HyperboloidParams = { ...defaultHyperboloid }
const view: ViewFlags = {
  showSurface: true,
  wireframe: false,
  showRulings: false,
  rulingCount: 48,
  rulingFamily: 'both',
  showFigure: true,
  showGround: true,
}
const render: RenderFlags = { exposure: 1, environment: 0.9 }

// Generators work in their natural frame with z as the axis of revolution;
// the world is y-up. Placement rotates, the mathematics stays clean.
const funnel = new THREE.Group()
funnel.rotation.x = -Math.PI / 2
funnel.position.x = 9
stage.scene.add(funnel)

// Generators work with z as the axis; the world is y-up, so placement rotates.
const columnGroup = new THREE.Group()
columnGroup.rotation.x = -Math.PI / 2
stage.scene.add(columnGroup)

const columnMesh = new THREE.Mesh(buildColumn(column), plasterMaterial())
columnMesh.castShadow = true
columnMesh.receiveShadow = true
columnGroup.add(columnMesh)

const surface = new THREE.Mesh(buildHyperboloidSurface(hyper), plasterMaterial())
surface.castShadow = true
surface.receiveShadow = true
funnel.add(surface)

const rulings = new THREE.LineSegments(
  buildHyperboloidRulings(hyper, view.rulingCount, view.rulingFamily),
  rulingMaterial(),
)
funnel.add(rulings)

function rebuild(): void {
  columnMesh.geometry.dispose()
  columnMesh.geometry = buildColumn(column)

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
  ;(surface.material as THREE.MeshStandardMaterial).wireframe = view.wireframe
  ;(columnMesh.material as THREE.MeshStandardMaterial).wireframe = view.wireframe
  stage.figure.visible = view.showFigure
  stage.ground.visible = view.showGround
}

function applyRender(): void {
  stage.setExposure(render.exposure)
  stage.scene.environmentIntensity = render.environment
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

buildPanel({ column, hyper, view, render, cam, overlay, rebuild, applyView, applyRender })

rebuild()
applyRender()
layout()

// Open on the column — it is 24 m tall, so the camera has to stand well back.
cam.camera.position.set(22, 11, 33)
cam.lookAt(new THREE.Vector3(0, columnMetrics(column.order).height * 0.45, 0))

// Dev convenience: drive the harness from the console, and from automated
// checks. Never referenced by the app itself.
declare global {
  interface Window {
    harness: {
      cam: FreeCamera
      overlay: PhotoOverlay
      column: ColumnParams
      columnMesh: THREE.Mesh
      hyper: HyperboloidParams
      view: ViewFlags
      stage: typeof stage
      rebuild: () => void
    }
  }
}
window.harness = { cam, overlay, column, hyper, view, stage, columnMesh, rebuild }

const clock = new THREE.Clock()
let hudAt = 0

function frame(): void {
  requestAnimationFrame(frame)
  const dt = Math.min(clock.getDelta(), 0.1)

  cam.update(dt)
  stage.renderer.render(stage.scene, stage.camera)

  reticle.classList.toggle('on', cam.isLocked)

  const now = performance.now()
  if (now - hudAt > 120) {
    hudAt = now
    const p = stage.camera.position
    const cm = columnMetrics(column.order)
    const tris =
      ((surface.geometry.index?.count ?? 0) + (columnMesh.geometry.index?.count ?? 0)) / 3
    hudEl.textContent = [
      `pos   ${p.x.toFixed(2)}  ${p.y.toFixed(2)}  ${p.z.toFixed(2)}`,
      `look  yaw ${deg(cam.yaw)}°   pitch ${deg(cam.pitch)}°`,
      `lens  ${stage.camera.fov.toFixed(1)}° fov   shift ${(cam.shiftCorrection * 100).toFixed(0)}%`,
      `move  ${cam.speed.toFixed(2)} m/s`,
      `mesh  ${tris.toLocaleString()} tris   ${(1 / Math.max(dt, 1e-4)).toFixed(0)} fps`,
      `col   order ${cm.order}  ${cm.height} m tall  ⌀ ${cm.innerDiameter.toFixed(1)} m  ` +
        `${cm.polygonCount}×${cm.polygonSides}-gon`,
    ].join('\n')
  }
}

function deg(radians: number): string {
  return ((radians * 180) / Math.PI).toFixed(1)
}

frame()
