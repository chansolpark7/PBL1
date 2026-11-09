import { MinHeap } from './heap';
import { reconstructPath, type Graph, type SearchGenerator } from './graph';

/**
 * Dijkstra's algorithm.
 * Settles the node with the smallest distance g from the start first.
 * Written as a generator (function*) so it yields the search one step at a time.
 */
export function* dijkstra(graph: Graph, start: number, goal: number): SearchGenerator {
  const n = graph.n;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const pq = new MinHeap<number>();

  dist[start] = 0;
  pq.push(start, 0);
  yield { type: 'push', node: start, g: 0, f: 0 };

  while (pq.size > 0) {
    const { item: u, key: d } = pq.pop()!;
    // The same node can be in the queue several times (lazy deletion), so skip stale entries
    if (closed[u] || d > dist[u]) continue;
    closed[u] = 1;
    yield { type: 'visit', node: u, g: dist[u] };

    if (u === goal) {
      yield { type: 'done', path: reconstructPath(prev, goal), cost: dist[goal] };
      return;
    }

    for (const { to: v, w } of graph.adj[u]) {
      if (closed[v]) continue;
      const nd = dist[u] + w;
      if (nd < dist[v]) {
        dist[v] = nd;
        prev[v] = u;
        pq.push(v, nd);
        yield { type: 'push', node: v, g: nd, f: nd };
      }
    }
  }

  yield { type: 'fail' };
}
