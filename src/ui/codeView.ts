/**
 * Debugger-style source view.
 * Takes the raw text of an algorithm file (imported with Vite's `?raw`), hides the `yield` lines that only
 * report progress to the visualizer, and highlights the line marked with `@label` at the end of its comment
 * (`x = 1; // @label` or `x = 1; // description @label`). The markers are removed from the displayed text.
 */

const MARKER = /\s*\/\/([^@]*?)\s*((?:@\w+\s*)+)$/;
const KEYWORDS = /\b(const|let|for|of|if|else|while|return|continue|break|export|function|new|true|false)\b/g;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function highlightSyntax(line: string): string {
  const ci = line.indexOf('//');
  const code = ci >= 0 ? line.slice(0, ci) : line;
  const comment = ci >= 0 ? line.slice(ci) : '';
  const html = esc(code)
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>')
    .replace(KEYWORDS, '<span class="tok-kw">$1</span>');
  return html + (comment ? `<span class="tok-com">${esc(comment)}</span>` : '');
}

export class CodeView {
  readonly el: HTMLElement;
  private scroller: HTMLElement;
  private lineEls: HTMLElement[] = [];
  private labels = new Map<string, number[]>(); // label → indexes of displayed lines
  private active: number[] = [];

  constructor(raw: string, fileName: string) {
    const src = raw.split(/\r?\n/);
    const startIdx = Math.max(0, src.findIndex((l) => l.startsWith('export function*')));
    const rows: { no: number; text: string }[] = [];
    for (let i = startIdx; i < src.length; i++) {
      const line = src[i];
      if (/^\s*yield\b/.test(line)) continue; // visualizer hook → hidden
      let text = line;
      const m = line.match(MARKER);
      if (m) {
        const desc = m[1].trim();
        text = line.slice(0, m.index) + (desc ? ` // ${desc}` : '');
        for (const tag of m[2].trim().split(/\s+/)) {
          const label = tag.slice(1);
          if (this.labels.has(label)) console.warn(`[CodeView] ${fileName}: label @${label} is on more than one line`);
          this.labels.set(label, [...(this.labels.get(label) ?? []), rows.length]);
        }
      }
      rows.push({ no: i + 1, text });
    }
    while (rows.length && rows[rows.length - 1].text.trim() === '') rows.pop();

    this.el = document.createElement('div');
    this.el.className = 'code-view';
    this.el.innerHTML = `
      <div class="code-head"><span class="file">src/algo/${fileName}</span>
        <span class="note">actual source · <code>yield</code> lines (visualizer hooks) hidden</span></div>
      <div class="code-scroll"><pre class="code"></pre></div>`;
    this.scroller = this.el.querySelector('.code-scroll')!;
    const pre = this.el.querySelector('pre')!;
    for (const row of rows) {
      const div = document.createElement('div');
      div.className = 'line';
      div.innerHTML = `<span class="arrow"></span><span class="ln">${row.no}</span><span class="src">${highlightSyntax(row.text) || ' '}</span>`;
      pre.appendChild(div);
      this.lineEls.push(div);
    }
  }

  /** True if some displayed line carries this label. */
  has(label: string): boolean {
    return this.labels.has(label);
  }

  /** Highlight the line marked with `@label`; null clears the highlight. */
  highlight(label: string | null): void {
    for (const i of this.active) this.lineEls[i].classList.remove('active');
    this.active = label ? (this.labels.get(label) ?? []) : [];
    for (const i of this.active) this.lineEls[i].classList.add('active');

    const first = this.lineEls[this.active[0]];
    if (first) {
      const top = first.offsetTop;
      const s = this.scroller;
      if (top < s.scrollTop || top + first.offsetHeight > s.scrollTop + s.clientHeight) {
        s.scrollTop = top - s.clientHeight / 3;
      }
    }
  }
}
