import { MinHeap } from './heap';
import { reconstructPath, type Graph, type Heuristic, type SearchGenerator } from './graph';

export interface AStarOptions {
  /**
   * When f values are equal, pop the node with the smaller h (= closer to the goal) first.
   * On 4-directional grids, where f ties are extremely common, this has a big effect on how many nodes are explored.
   */
  tieBreakByH?: boolean;
}

/**
 * A* search.
 * Settles the node with the smallest f(v) = g(v) + h(v) first.
 *  - If h never exceeds the true remaining cost (admissible), the shortest path is guaranteed.
 *  - If h overestimates, the search may finish sooner but the shortest path is not guaranteed.
 *  - With h = 0 it behaves exactly like Dijkstra.
 */
export function* astar(
  graph: Graph,
  start: number,
  goal: number,
  h: Heuristic,
  options: AStarOptions = {},
): SearchGenerator {
  const { tieBreakByH = true } = options;
  const n = graph.n;
  const g = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const pq = new MinHeap<number>();

  const push = (v: number) => {
    const hv = h(v);
    const f = g[v] + hv;
    pq.push(v, f, tieBreakByH ? hv : 0);
    return f;
  };

  g[start] = 0;
  const f0 = push(start);
  yield { type: 'push', node: start, g: 0, f: f0 };

  while (pq.size > 0) {
    const { item: u } = pq.pop()!;
    if (closed[u]) continue; // skip stale entries for nodes already settled
    closed[u] = 1;
    yield { type: 'visit', node: u, g: g[u] };

    if (u === goal) {
      yield { type: 'done', path: reconstructPath(prev, goal), cost: g[goal] };
      return;
    }

    for (const { to: v, w } of graph.adj[u]) {
      if (closed[v]) continue;
      const ng = g[u] + w;
      if (ng < g[v]) {
        g[v] = ng;
        prev[v] = u;
        const f = push(v);
        yield { type: 'push', node: v, g: ng, f };
      }
    }
  }

  yield { type: 'fail' };
}
