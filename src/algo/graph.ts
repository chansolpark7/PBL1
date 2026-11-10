import type { MinHeap } from './heap';

/** Shared graph types. Both general graphs and grids are converted to this form before running an algorithm. */

export interface Edge {
  to: number;
  w: number; // edge weight (must be non-negative)
}

export interface Graph {
  n: number; // number of nodes (nodes are numbered 0 to n-1)
  adj: Edge[][]; // adjacency list
}

/** Heuristic: estimated remaining cost from node v to the goal */
export type Heuristic = (v: number) => number;

type StepBody =
  | { type: 'line' } // a line with no effect the visualizer tracks (e.g. allocating an array)
  | { type: 'cond'; value: boolean } // an if/while condition was evaluated
  | { type: 'calc'; value: number } // a local variable was computed
  | { type: 'init'; heap: MinHeap<number> } // the priority queue was created
  | { type: 'setG'; node: number; g: number } // dist[v] / g[v] assigned
  | { type: 'setPrev'; node: number; prev: number } // prev[v] assigned
  | { type: 'push'; node: number; g: number; f: number } // pushed onto the priority queue (frontier)
  | { type: 'pop'; node: number; key: number } // smallest entry taken out of the queue
  | { type: 'stale'; node: number } // popped entry was outdated → skipped (lazy deletion)
  | { type: 'visit'; node: number; g: number } // node settled (closed): its cost is final
  | { type: 'edge'; from: number; to: number; w: number } // next edge of the node being expanded
  | { type: 'edgesDone'; node: number } // no more edges to examine
  | { type: 'skipClosed'; node: number } // neighbor already settled → skipped
  | { type: 'compare'; node: number; newG: number; oldG: number; better: boolean } // relaxation test
  | { type: 'done'; path: number[]; cost: number } // reached the goal
  | { type: 'fail' }; // no path exists

/**
 * Events an algorithm emits one at a time — one per executed source line.
 * The visualization only looks at these events to draw the screen (algorithm and rendering are decoupled).
 * `at` names the source line that just ran: the line in the algorithm file marked with `@<at>` at the end of its comment.
 */
export type Step = StepBody & { at: string };

export type SearchGenerator = Generator<Step, void, unknown>;

/** Follows the prev array backwards to build the start → goal path. */
export function reconstructPath(prev: Int32Array, goal: number): number[] {
  const path: number[] = [];
  for (let v = goal; v !== -1; v = prev[v]) path.push(v);
  return path.reverse();
}
