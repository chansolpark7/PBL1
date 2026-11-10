/**
 * Binary min-heap (priority queue), stored as an array:
 *   index 0 is the root; the children of index i are 2i+1 and 2i+2; the parent of i is (i-1)/2.
 * Ordering: key → tie → insertion order (seq; earlier first).
 *  - key : g for Dijkstra, f = g + h for A*
 *  - tie : secondary key for breaking ties (A* passes h so nodes closer to the goal come out first)
 *  - seq : final criterion so results are always the same (deterministic)
 */
export interface HeapEntry<T> {
  item: T;
  key: number;
  tie: number;
  seq: number;
}

/** Record of the most recent push/pop, used by the visualizer. */
export interface HeapOp<T> {
  kind: 'push' | 'pop';
  entry: HeapEntry<T>; // the entry that was pushed or popped
  path: number[]; // array indices visited while sifting (first → final position)
  swaps: number;
}

export class MinHeap<T> {
  private data: HeapEntry<T>[] = [];
  private seqCounter = 0;

  // Statistics for the visualizer (they do not affect the algorithm)
  comparisons = 0;
  swaps = 0;
  lastOp: HeapOp<T> | null = null;

  get size(): number {
    return this.data.length;
  }

  /** Read-only view of the underlying array. */
  get entries(): readonly HeapEntry<T>[] {
    return this.data;
  }

  /** O(log n): append at the end, then sift up while smaller than the parent. */
  push(item: T, key: number, tie = 0): void {
    const entry = { item, key, tie, seq: this.seqCounter++ };
    this.data.push(entry);
    const path = this.siftUp(this.data.length - 1);
    this.lastOp = { kind: 'push', entry, path, swaps: path.length - 1 };
  }

  /** O(log n): take the root, move the last entry to the root, then sift it down. */
  pop(): { item: T; key: number } | undefined {
    const data = this.data;
    if (data.length === 0) return undefined;
    const top = data[0];
    const last = data.pop()!;
    let path: number[] = [];
    if (data.length > 0) {
      data[0] = last;
      path = this.siftDown(0);
    }
    this.lastOp = { kind: 'pop', entry: top, path, swaps: Math.max(0, path.length - 1) };
    return { item: top.item, key: top.key };
  }

  private less(a: HeapEntry<T>, b: HeapEntry<T>): boolean {
    this.comparisons++;
    if (a.key !== b.key) return a.key < b.key;
    if (a.tie !== b.tie) return a.tie < b.tie;
    return a.seq < b.seq;
  }

  private swap(i: number, j: number): void {
    const data = this.data;
    [data[i], data[j]] = [data[j], data[i]];
    this.swaps++;
  }

  private siftUp(i: number): number[] {
    const path = [i];
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(this.data[i], this.data[parent])) break;
      this.swap(i, parent);
      i = parent;
      path.push(i);
    }
    return path;
  }

  private siftDown(i: number): number[] {
    const data = this.data;
    const n = data.length;
    const path = [i];
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let smallest = i;
      if (l < n && this.less(data[l], data[smallest])) smallest = l;
      if (r < n && this.less(data[r], data[smallest])) smallest = r;
      if (smallest === i) break;
      this.swap(i, smallest);
      i = smallest;
      path.push(i);
    }
    return path;
  }
}
