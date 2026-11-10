import type { HeapEntry, MinHeap } from '../algo/heap';
import { fmt } from './graphView';

const LEVEL_H = 58;
const R = 16;
const TOP = 24;
const MIN_GAP = 6; // minimum space between neighboring circles on the bottom level
const IDX_ROOM = 2 * R + 30; // horizontal room a node needs before its array index is drawn next to it

/**
 * Draws a MinHeap both as a binary tree (top levels) and as the underlying array.
 *  - entries on the sift path of the latest push/pop are outlined
 *  - stale entries (outdated duplicates that lazy deletion will skip) are greyed out
 */
export class HeapView {
  readonly el: HTMLElement;
  private treeEl: HTMLElement;
  private arrayEl: HTMLElement;
  private opEl: HTMLElement;
  // Tallest tree drawn for the current heap, so the panel doesn't jump up and down while it shrinks
  private lastHeap: MinHeap<number> | null = null;
  private levelsSeen = 1;
  // SVG width (viewBox units): wide enough that the deepest level's nodes don't overlap
  private readonly W: number;

  constructor(
    private label: (node: number) => string,
    private maxLevels: number,
  ) {
    this.W = Math.max(640, 2 ** (maxLevels - 1) * (2 * R + MIN_GAP));
    this.el = document.createElement('div');
    this.el.className = 'heap-view';
    this.el.innerHTML = `
      <div class="heap-op"></div>
      <div class="heap-tree"></div>
      <div class="heap-array-head">Underlying array <span>(children of index i are 2i+1 and 2i+2)</span></div>
      <div class="heap-array"></div>`;
    this.opEl = this.el.querySelector('.heap-op')!;
    this.treeEl = this.el.querySelector('.heap-tree')!;
    this.arrayEl = this.el.querySelector('.heap-array')!;
  }

  render(heap: MinHeap<number> | null, isStale: (e: HeapEntry<number>) => boolean, showOp: boolean): void {
    if (!heap) {
      this.opEl.textContent = 'The heap has not been created yet.';
      this.treeEl.innerHTML = '';
      this.arrayEl.innerHTML = '';
      return;
    }
    const entries = heap.entries;
    const n = entries.length;
    const op = showOp ? heap.lastOp : null;
    const onPath = new Set(op?.path ?? []);
    const finalIdx = op && op.path.length ? op.path[op.path.length - 1] : -1;
    const L = (e: HeapEntry<number>) => this.label(e.item);

    // Description of the latest operation
    if (op?.kind === 'push') {
      const moved = op.swaps === 0 ? 'no swap needed' : `sifted up ${op.swaps} level${op.swaps > 1 ? 's' : ''} to index ${finalIdx}`;
      this.opEl.innerHTML = `<b>push(${L(op.entry)}, ${fmt(op.entry.key)})</b> → appended at index ${op.path[0]}, ${moved}.`;
    } else if (op?.kind === 'pop') {
      const rest =
        n === 0
          ? 'the heap is now empty.'
          : `the last entry moved to the root and sifted down ${op.swaps} level${op.swaps === 1 ? '' : 's'}.`;
      this.opEl.innerHTML = `<b>pop()</b> → removed the root <b>${L(op.entry)}</b> (key ${fmt(op.entry.key)}); ${rest}`;
    } else {
      this.opEl.innerHTML = `Size <b>${n}</b>. The root (index 0) always holds the smallest key.`;
    }

    // Tree (only the top levels for big heaps)
    const levels = Math.min(this.maxLevels, n ? Math.floor(Math.log2(n)) + 1 : 1);
    const shown = Math.min(n, 2 ** levels - 1);
    if (heap !== this.lastHeap) {
      this.lastHeap = heap;
      this.levelsSeen = 1;
    }
    this.levelsSeen = Math.max(this.levelsSeen, levels);
    const W = this.W;
    const depth = (i: number) => Math.floor(Math.log2(i + 1));
    const pos = (i: number) => {
      const d = depth(i);
      const p = i - (2 ** d - 1);
      return { x: ((p + 0.5) * W) / 2 ** d, y: TOP + d * LEVEL_H };
    };
    let lines = '';
    let nodes = '';
    for (let i = 0; i < shown; i++) {
      const { x, y } = pos(i);
      if (i > 0) {
        const pp = pos((i - 1) >> 1);
        const hot = onPath.has(i) && onPath.has((i - 1) >> 1) ? ' hot' : '';
        lines += `<line class="hedge${hot}" x1="${pp.x}" y1="${pp.y}" x2="${x}" y2="${y}"/>`;
      }
      const e = entries[i];
      let cls = 'hnode';
      if (isStale(e)) cls += ' stale';
      if (onPath.has(i)) cls += ' hot';
      if (i === finalIdx) cls += ' final';
      nodes += `<g class="${cls}"><circle cx="${x}" cy="${y}" r="${R}"/>
        <text class="hlabel" x="${x}" y="${y}">${L(e)}</text>
        <text class="hkey" x="${x}" y="${y + R + 11}">${fmt(e.key)}</text>
        ${W / 2 ** depth(i) >= IDX_ROOM ? `<text class="hidx" x="${x + R + 3}" y="${y - R + 2}">${i}</text>` : ''}</g>`;
    }
    const height = TOP + (this.levelsSeen - 1) * LEVEL_H + R + 34;
    const more = n > shown ? `<text class="hmore" x="${W / 2}" y="${height - 6}">+ ${n - shown} more entries in deeper levels (see the array below)</text>` : '';
    const empty = n === 0 ? `<text class="hmore" x="${W / 2}" y="${TOP + 4}">(empty)</text>` : '';
    this.treeEl.innerHTML = `<svg viewBox="0 0 ${W} ${height}" class="heap-svg">${lines}${nodes}${more}${empty}</svg>`;

    // Array
    let cells = '';
    for (let i = 0; i < n; i++) {
      const e = entries[i];
      let cls = 'hcell';
      if (isStale(e)) cls += ' stale';
      if (onPath.has(i)) cls += ' hot';
      if (i === finalIdx) cls += ' final';
      cells += `<div class="${cls}"><span class="i">${i}</span><b>${L(e)}</b><span class="k">${fmt(e.key)}</span></div>`;
    }
    this.arrayEl.innerHTML = cells || '<span class="muted">[ ]</span>';
  }
}
