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

/**
 * Events an algorithm emits one at a time.
 * The visualization only looks at these events to draw the screen (algorithm and rendering are decoupled).
 */
export type Step =
  | { type: 'push'; node: number; g: number; f: number } // pushed onto the priority queue (frontier)
  | { type: 'visit'; node: number; g: number } // popped from the queue and settled (closed)
  | { type: 'done'; path: number[]; cost: number } // reached the goal
  | { type: 'fail' }; // no path exists

export type SearchGenerator = Generator<Step, void, unknown>;

/** Follows the prev array backwards to build the start → goal path. */
export function reconstructPath(prev: Int32Array, goal: number): number[] {
  const path: number[] = [];
  for (let v = goal; v !== -1; v = prev[v]) path.push(v);
  return path.reverse();
}
