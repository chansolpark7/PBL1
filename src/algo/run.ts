import type { SearchGenerator } from './graph';

export const NodeState = {
  None: 0,
  Frontier: 1, // currently in the queue
  Closed: 2, // settled (visited)
} as const;

/**
 * Wraps an algorithm generator and accumulates what the screen needs (node states, stats, path).
 * One expand() call = advance until one node is settled, so several algorithms can be compared at the same pace.
 */
export class SearchRun {
  readonly state: Uint8Array;
  readonly g: Float64Array; // best known cost from the start so far
  readonly f: Float64Array; // priority value when pushed onto the queue (equals g for Dijkstra)
  visitedCount = 0;
  pushCount = 0;
  current = -1;
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
  }

  /** Advance until a node is settled or the search ends. Returns true while the search is still running. */
  expand(): boolean {
    while (!this.finished) {
      const r = this.gen.next();
      if (r.done) {
        this.finished = true;
        break;
      }
      const step = r.value;
      switch (step.type) {
        case 'push':
          this.pushCount++;
          this.g[step.node] = step.g;
          this.f[step.node] = step.f;
          if (this.state[step.node] === NodeState.None) this.state[step.node] = NodeState.Frontier;
          break;
        case 'visit':
          this.state[step.node] = NodeState.Closed;
          this.visitedCount++;
          this.current = step.node;
          return true;
        case 'done':
          this.path = step.path;
          this.cost = step.cost;
          this.found = true;
          this.finished = true;
          this.current = -1;
          break;
        case 'fail':
          this.finished = true;
          this.current = -1;
          break;
      }
    }
    return false;
  }

  runToEnd(): void {
    while (this.expand());
  }
}
