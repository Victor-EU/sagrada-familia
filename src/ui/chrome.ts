import { JOURNEY, OVERTURE, type Journey, type Moment } from './journey.ts'

/**
 * The interface, such as it is.
 *
 * The previous one was a parameter panel three hundred and ten pixels wide
 * holding every number in the model, which is the right interface for the
 * person building it and the wrong one for everybody else: it took a third of
 * the window, it put a wall of sliders next to a cathedral, and it invited
 * the viewer to adjust the branch count instead of looking up. It still
 * exists — see dev/params.ts — but it is now something you have to ask for.
 *
 * What is left has one job: say where you are, offer the next place, and get
 * out of the way. Everything here is absolutely positioned over the canvas,
 * nothing here takes a pixel off the render, and every control also has a
 * key, because a viewer who has found the arrow keys should never have to
 * come back to the mouse.
 */
export class Chrome {
  private readonly root: HTMLElement
  private readonly intro: HTMLElement
  private readonly caption: HTMLElement
  private readonly capIndex: HTMLElement
  private readonly capTitle: HTMLElement
  private readonly capText: HTMLElement
  private readonly rail: HTMLElement
  private readonly prev: HTMLButtonElement
  private readonly next: HTMLButtonElement
  private readonly resume: HTMLButtonElement
  private readonly hint: HTMLElement
  private readonly dots: HTMLButtonElement[] = []

  private hintTimer = 0
  /** True once the viewer has taken the controls and is no longer on the tour. */
  private free = false

  constructor(
    private readonly journey: Journey,
    private readonly host: HTMLElement,
  ) {
    this.root = el('div', 'chrome')

    this.intro = el('div', 'intro')
    this.intro.innerHTML = `
      <div class="intro-inner">
        <p class="kicker">Barcelona · begun 1882 · unfinished</p>
        <h1>Sagrada Família</h1>
        <p class="blurb">
          Every surface here is generated from Gaudí’s own rules — the ruled
          surfaces, the 7.5 m module, the four stones — and lit by the real sun
          over Barcelona. Nothing was downloaded.
        </p>
        <button class="begin" type="button">Step outside</button>
        <p class="sub">or press <kbd>F</kbd> to explore on your own</p>
      </div>`

    this.caption = el('div', 'caption')
    this.capIndex = el('p', 'cap-index')
    this.capTitle = el('h2', 'cap-title')
    this.capText = el('p', 'cap-text')
    this.caption.append(this.capIndex, this.capTitle, this.capText)

    this.rail = el('div', 'rail')
    this.prev = button('‹', 'Previous', () => this.journey.prev())
    this.next = button('›', 'Next', () => this.journey.next())
    const dots = el('div', 'dots')
    JOURNEY.forEach((m, i) => {
      const dot = button('', m.title, () => this.journey.goTo(i))
      dot.classList.add('dot')
      dot.dataset.part = m.part
      this.dots.push(dot)
      dots.append(dot)
    })
    this.rail.append(this.prev, dots, this.next)

    this.resume = button('Resume the visit', 'Resume', () => {
      this.free = false
      this.journey.goTo(this.journey.index, 2.2)
      this.sync()
    })
    this.resume.classList.add('resume')

    this.hint = el('div', 'hint')
    this.hint.innerHTML =
      '<strong>drag</strong> to look · <strong>W A S D</strong> to walk · ' +
      '<strong>space</strong> up · <strong>C</strong> down · ' +
      '<strong>←</strong> <strong>→</strong> move through the visit'

    this.root.append(this.caption, this.rail, this.resume, this.hint, this.intro)
    this.host.append(this.root)

    this.intro.querySelector('.begin')!.addEventListener('click', () => this.begin())
  }

  /** Dismiss the title card and set off. */
  begin(): void {
    if (!this.intro.classList.contains('gone')) {
      this.intro.classList.add('gone')
      this.showHint()
    }
    this.free = false
    // Put the camera out at the overture pose and fly in from there, so the
    // visit opens on a move rather than on a held frame.
    this.journey.place(OVERTURE)
    this.journey.goTo(0)
    this.sync()
  }

  /** Leave the tour where it is and hand the camera over. */
  explore(): void {
    this.intro.classList.add('gone')
    this.free = true
    this.journey.cancel()
    this.sync()
    this.showHint()
  }

  /** The viewer touched something. Step aside without losing our place. */
  takeOver(): void {
    if (this.free || !this.intro.classList.contains('gone')) return
    this.free = true
    this.journey.cancel()
    this.sync()
  }

  arrive(moment: Moment, index: number): void {
    this.capIndex.textContent = `${String(index + 1).padStart(2, '0')} — ${
      moment.part === 'outside' ? 'Outside' : 'Inside'
    }`
    this.capTitle.textContent = moment.title
    this.capText.textContent = moment.caption
    this.sync()
  }

  /** Fade the caption out while the camera is moving; it is unreadable anyway. */
  setTravelling(travelling: boolean): void {
    this.caption.classList.toggle('moving', travelling)
  }

  private sync(): void {
    const started = this.intro.classList.contains('gone')
    this.root.classList.toggle('free', this.free)
    this.root.classList.toggle('running', started && !this.free)
    this.prev.disabled = this.journey.index === 0
    this.next.disabled = this.journey.atEnd
    this.dots.forEach((dot, i) => {
      dot.classList.toggle('on', i === this.journey.index)
      dot.classList.toggle('past', i < this.journey.index)
    })
  }

  private showHint(): void {
    this.hint.classList.add('on')
    window.clearTimeout(this.hintTimer)
    this.hintTimer = window.setTimeout(() => this.hint.classList.remove('on'), 7000)
  }
}

function el(tag: string, cls: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = cls
  return node
}

function button(label: string, title: string, onClick: () => void): HTMLButtonElement {
  const node = document.createElement('button')
  node.type = 'button'
  node.textContent = label
  node.title = title
  node.setAttribute('aria-label', title)
  node.addEventListener('click', (event) => {
    event.stopPropagation()
    onClick()
  })
  return node
}
