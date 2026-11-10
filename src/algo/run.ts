import type { SearchGenerator, Step } from './graph';
import type { MinHeap } from './heap';

export const NodeState = {
  None: 0,
  Frontier: 1, // currently in the queue
  Closed: 2, // settled (visited)
} as const;

/**
 * Wraps an algorithm generator and accumulates what the screen needs (node states, stats, path).
 *  - advance(): process exactly one event (one highlighted code line) — used by the step-through view
 *  - expand():  advance until one node is settled — used to compare several algorithms at the same pace
 */
export class SearchRun {
  readonly state: Uint8Array;
  readonly g: Float64Array; // best known cost from the start so far
  readonly f: Float64Array; // priority value of the newest queue entry (equals g for Dijkstra)
  readonly prev: Int32Array; // previous node on the best known path
  visitedCount = 0;
  pushCount = 0;
  popCount = 0;
  staleSkipped = 0; // popped entries skipped by lazy deletion
  closedSkipped = 0; // edges skipped because the neighbor was already settled
  maxHeapSize = 0;
  current = -1; // node being expanded (most recently settled)
  focus = -1; // node the latest step is about
  edgeFrom = -1; // edge currently being examined
  edgeTo = -1;
  lastPushWasUpdate = false; // the latest push added a second entry for a node already in the queue
  heap: MinHeap<number> | null = null;
  lastStep: Step | null = null;
  path: number[] = [];
  cost = Infinity;
  finished = false;
  found = false;

  constructor(
    n: number,
    private gen: SearchGenerator,
  ) {
    this.state = new Uint8Array(n);
    this.g = new Float64Array(n).fill(Infinity);
    this.f = new Float64Array(n).fill(Infinity);
    this.prev = new Int32Array(n).fill(-1);
  }

  /** Process one event. Returns it, or null if the search had already ended. */
  advance(): Step | null {
    if (this.finished) return null;
    const r = this.gen.next();
    if (r.done) {
      this.finished = true;
      return null;
    }
    const step = r.value;
    this.lastStep = step;
    switch (step.type) {
      case 'line':
      case 'cond':
      case 'calc':
        break;
      case 'init':
        this.heap = step.heap;
        break;
      case 'setG':
        this.g[step.node] = step.g;
        this.focus = step.node;
        break;
      case 'setPrev':
        this.prev[step.node] = step.prev;
        this.focus = step.node;
        break;
      case 'edgesDone':
        this.edgeFrom = this.edgeTo = -1;
        this.focus = step.node;
        break;
      case 'push':
        this.pushCount++;
        this.lastPushWasUpdate = this.state[step.node] === NodeState.Frontier;
        this.g[step.node] = step.g;
        this.f[step.node] = step.f;
        if (this.state[step.node] === NodeState.None) this.state[step.node] = NodeState.Frontier;
        this.focus = step.node;
        this.maxHeapSize = Math.max(this.maxHeapSize, this.heap?.size ?? 0);
        break;
      case 'pop':
        this.popCount++;
        this.current = -1;
        this.focus = step.node;
        this.edgeFrom = this.edgeTo = -1;
        break;
      case 'stale':
        this.staleSkipped++;
        break;
      case 'visit':
        this.state[step.node] = NodeState.Closed;
        this.visitedCount++;
        this.current = step.node;
        this.focus = step.node;
        break;
      case 'edge':
        this.edgeFrom = step.from;
        this.edgeTo = step.to;
        this.focus = step.to;
        break;
      case 'skipClosed':
        this.closedSkipped++;
        break;
      case 'compare':
        break;
      case 'done':
        this.path = step.path;
        this.cost = step.cost;
        this.found = true;
        this.finished = true;
        this.current = -1;
        this.edgeFrom = this.edgeTo = -1;
        break;
      case 'fail':
        this.finished = true;
        this.current = -1;
        this.focus = -1;
        this.edgeFrom = this.edgeTo = -1;
        break;
    }
    return step;
  }

  /** Advance until a node is settled or the search ends. Returns true while the search is still running. */
  expand(): boolean {
    for (;;) {
      const step = this.advance();
      if (!step || this.finished) return false;
      if (step.type === 'visit') {
        this.edgeFrom = this.edgeTo = -1;
        return true;
      }
    }
  }

  runToEnd(): void {
    while (this.expand());
  }
}
