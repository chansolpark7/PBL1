/**
 * Binary min-heap (priority queue).
 * Ordering: key → tie → insertion order (seq; earlier first).
 *  - key : g for Dijkstra, f = g + h for A*
 *  - tie : secondary key for breaking ties (A* passes h so nodes closer to the goal come out first)
 *  - seq : final criterion so results are always the same (deterministic)
 */
interface Entry<T> {
  item: T;
  key: number;
  tie: number;
  seq: number;
}

export class MinHeap<T> {
  private data: Entry<T>[] = [];
  private seqCounter = 0;

  get size(): number {
    return this.data.length;
  }

  push(item: T, key: number, tie = 0): void {
    this.data.push({ item, key, tie, seq: this.seqCounter++ });
    this.siftUp(this.data.length - 1);
  }

  pop(): { item: T; key: number } | undefined {
    const data = this.data;
    if (data.length === 0) return undefined;
    const top = data[0];
    const last = data.pop()!;
    if (data.length > 0) {
      data[0] = last;
      this.siftDown(0);
    }
    return { item: top.item, key: top.key };
  }

  private less(a: Entry<T>, b: Entry<T>): boolean {
    if (a.key !== b.key) return a.key < b.key;
    if (a.tie !== b.tie) return a.tie < b.tie;
    return a.seq < b.seq;
  }

  private siftUp(i: number): void {
    const data = this.data;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(data[i], data[parent])) break;
      [data[i], data[parent]] = [data[parent], data[i]];
      i = parent;
    }
  }

  private siftDown(i: number): void {
    const data = this.data;
    const n = data.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let smallest = i;
      if (l < n && this.less(data[l], data[smallest])) smallest = l;
      if (r < n && this.less(data[r], data[smallest])) smallest = r;
      if (smallest === i) break;
      [data[i], data[smallest]] = [data[smallest], data[i]];
      i = smallest;
    }
  }
}
