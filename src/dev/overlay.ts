/**
 * Photo-match overlay — the harness the whole reconstruction leans on.
 *
 * Geometry is generated from rules, so photographs are the acceptance test
 * rather than the source. This puts a reference photo over the render so a
 * camera can be matched to it and parameters tuned until the silhouettes lock.
 *
 * Reference images stay here, in the dev harness. Nothing licensed is ever
 * shipped in the build — what ships is numbers.
 */
export class PhotoOverlay {
  /** Aspect ratio of the loaded photo, or null when none is loaded. */
  aspect: number | null = null
  /** Called when the loaded image changes, so the stage can re-letterbox. */
  onChange: (() => void) | null = null

  private objectUrl: string | null = null
  private _opacity = 0.5
  private _visible = true
  private _difference = false
  private _lockAspect = true

  constructor(
    private readonly img: HTMLImageElement,
    private readonly dropZone: HTMLElement = document.body,
  ) {
    this.bindDrop()
    this.bindKeys()
    this.apply()
  }

  get hasImage(): boolean {
    return this.aspect !== null
  }

  get opacity(): number {
    return this._opacity
  }
  set opacity(value: number) {
    this._opacity = Math.min(1, Math.max(0, value))
    this.apply()
  }

  get visible(): boolean {
    return this._visible
  }
  set visible(value: boolean) {
    this._visible = value
    this.apply()
  }

  get difference(): boolean {
    return this._difference
  }
  set difference(value: boolean) {
    this._difference = value
    this.img.classList.toggle('difference', value)
  }

  get lockAspect(): boolean {
    return this._lockAspect
  }
  set lockAspect(value: boolean) {
    this._lockAspect = value
    this.onChange?.()
  }

  async load(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) return
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl)
    this.objectUrl = URL.createObjectURL(file)

    await new Promise<void>((resolve, reject) => {
      this.img.onload = () => resolve()
      this.img.onerror = () => reject(new Error(`could not decode ${file.name}`))
      this.img.src = this.objectUrl as string
    })

    this.aspect = this.img.naturalWidth / this.img.naturalHeight
    this.apply()
    this.onChange?.()
  }

  clear(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl)
    this.objectUrl = null
    this.img.removeAttribute('src')
    this.aspect = null
    this.apply()
    this.onChange?.()
  }

  /** Opens a file picker — the panel button, for when dropping is awkward. */
  pick(): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (file) void this.load(file)
    })
    input.click()
  }

  private apply(): void {
    this.img.style.opacity = String(this.hasImage && this._visible ? this._opacity : 0)
  }

  private bindDrop(): void {
    const stop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    this.dropZone.addEventListener('dragover', stop)
    this.dropZone.addEventListener('drop', (e) => {
      stop(e)
      const file = e.dataTransfer?.files?.[0]
      if (file) void this.load(file)
    })
  }

  private bindKeys(): void {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return
      switch (e.code) {
        case 'KeyO':
          this.visible = !this.visible
          break
        case 'KeyX':
          this.difference = !this.difference
          break
        case 'BracketLeft':
          this.opacity = this._opacity - 0.05
          break
        case 'BracketRight':
          this.opacity = this._opacity + 0.05
          break
      }
    })
  }
}
