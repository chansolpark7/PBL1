/** Play / pause / step / run to end / reset controls, plus a speed slider */

export interface PlayerHooks {
  reset(): void; // put the search back in its initial state
  step(): boolean; // advance one step; true if there is more to do
  render(): void;
  onFinish?(): void;
  onUserReset?(): void; // called when the user clicks the Reset button
}

const SPEED_MAX_EXP = 3; // speed range: 10^0 to 10^3 steps per second

export class Player {
  readonly el: HTMLElement;
  private playing = false;
  private finished = false;
  private speed: number;
  private acc = 0;
  private lastT = 0;
  private playBtn: HTMLButtonElement;
  private speedLabel: HTMLSpanElement;

  constructor(
    private hooks: PlayerHooks,
    opts: { speed?: number; stepLabel?: string } = {},
  ) {
    this.speed = opts.speed ?? 30;
    this.el = document.createElement('div');
    this.el.className = 'player';
    this.el.innerHTML = `
      <button data-act="play" class="primary">▶ Play</button>
      <button data-act="step">${opts.stepLabel ?? 'Step'}</button>
      <button data-act="end">Run to End</button>
      <button data-act="reset">Reset</button>
      <label class="speed">Speed
        <input type="range" min="0" max="100" value="${Math.round((Math.log10(this.speed) / SPEED_MAX_EXP) * 100)}">
        <span></span>
      </label>`;
    this.playBtn = this.el.querySelector('[data-act="play"]')!;
    this.speedLabel = this.el.querySelector('.speed span')!;
    const range = this.el.querySelector<HTMLInputElement>('.speed input')!;

    this.playBtn.onclick = () => (this.playing ? this.pause() : this.play());
    this.el.querySelector<HTMLButtonElement>('[data-act="step"]')!.onclick = () => this.stepOnce();
    this.el.querySelector<HTMLButtonElement>('[data-act="end"]')!.onclick = () => this.finishAll();
    this.el.querySelector<HTMLButtonElement>('[data-act="reset"]')!.onclick = () => {
      this.hooks.onUserReset?.();
      this.reset();
    };
    range.oninput = () => {
      this.speed = Math.round(10 ** ((Number(range.value) / 100) * SPEED_MAX_EXP));
      this.updateUI();
    };
    this.updateUI();
  }

  get isFinished(): boolean {
    return this.finished;
  }

  reset(): void {
    this.pause();
    this.finished = false;
    this.hooks.reset();
    this.hooks.render();
    this.updateUI();
  }

  play(): void {
    if (this.finished) this.reset(); // playing after the end → start over
    if (this.playing) return;
    this.playing = true;
    this.acc = 1; // take one step immediately on press
    this.lastT = performance.now();
    requestAnimationFrame(this.loop);
    this.updateUI();
  }

  pause(): void {
    this.playing = false;
    this.updateUI();
  }

  stepOnce(): void {
    this.pause();
    if (this.finished) return;
    if (!this.hooks.step()) this.markFinished();
    this.hooks.render();
  }

  /** Step repeatedly until `stop()` returns true or the run ends. */
  stepUntil(stop: () => boolean): void {
    this.pause();
    if (this.finished) return;
    for (;;) {
      if (!this.hooks.step()) {
        this.markFinished();
        break;
      }
      if (stop()) break;
    }
    this.hooks.render();
  }

  finishAll(): void {
    this.pause();
    if (!this.finished) {
      while (this.hooks.step());
      this.markFinished();
    }
    this.hooks.render();
  }

  private markFinished(): void {
    this.finished = true;
    this.playing = false;
    this.updateUI();
    this.hooks.onFinish?.();
  }

  private loop = (t: number) => {
    if (!this.playing) return;
    const dt = Math.min(100, t - this.lastT);
    this.lastT = t;
    this.acc += (dt / 1000) * this.speed;
    while (this.acc >= 1 && this.playing) {
      this.acc -= 1;
      if (!this.hooks.step()) this.markFinished();
    }
    this.hooks.render();
    if (this.playing) requestAnimationFrame(this.loop);
  };

  private updateUI(): void {
    this.playBtn.textContent = this.playing ? '⏸ Pause' : this.finished ? '↻ Replay' : '▶ Play';
    this.speedLabel.textContent = `${this.speed} steps/s`;
  }
}
