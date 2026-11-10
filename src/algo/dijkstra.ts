import { MinHeap } from './heap';
import { reconstructPath, type Graph, type SearchGenerator } from './graph';

/**
 * Dijkstra's algorithm.
 * Settles the node with the smallest distance from the start first.
 *
 * Written as a generator (function*) so the visualizer can run it one line at a time:
 *  - after every executable line there is a `yield` that reports that line (for if/while conditions,
 *    the `yield` comes right before the condition and reports its value — conditions have no side effects);
 *  - `@name` at the end of a line's comment marks the line that the step with `at: 'name'` highlights.
 * The on-screen code view shows this file with the `yield` lines hidden.
 */
export function* dijkstra(graph: Graph, start: number, goal: number): SearchGenerator {
  const n = graph.n; // @n
  yield { type: 'line', at: 'n' };
  const dist = new Float64Array(n).fill(Infinity); // best known distance @dist
  yield { type: 'line', at: 'dist' };
  const prev = new Int32Array(n).fill(-1); // previous node on that path @prev
  yield { type: 'line', at: 'prev' };
  const closed = new Uint8Array(n); // 1 = settled (final) @closed
  yield { type: 'line', at: 'closed' };
  const pq = new MinHeap<number>(); // @init
  yield { type: 'init', heap: pq, at: 'init' };

  dist[start] = 0; // @g0
  yield { type: 'setG', node: start, g: 0, at: 'g0' };
  pq.push(start, 0); // @start
  yield { type: 'push', node: start, g: 0, f: 0, at: 'start' };

  while (pq.size > 0) { // @loop @loopEnd
    yield { type: 'cond', value: true, at: 'loop' };
    const { item: u, key: d } = pq.pop()!; // @pop
    yield { type: 'pop', node: u, key: d, at: 'pop' };

    // Lazy deletion: skip outdated duplicate entries
    yield { type: 'cond', value: closed[u] === 1 || d > dist[u], at: 'staleCheck' };
    if (closed[u] || d > dist[u]) { // @staleCheck
      yield { type: 'stale', node: u, at: 'stale' };
      continue; // @stale
    }
    closed[u] = 1; // @visit
    yield { type: 'visit', node: u, g: dist[u], at: 'visit' };

    // Early exit: the goal's distance is final once popped
    yield { type: 'cond', value: u === goal, at: 'goalCheck' };
    if (u === goal) { // @goalCheck
      yield { type: 'done', path: reconstructPath(prev, goal), cost: dist[goal], at: 'done' };
      return; // @done
    }

    for (const { to: v, w } of graph.adj[u]) { // @edge @edgesDone
      yield { type: 'edge', from: u, to: v, w, at: 'edge' };
      yield { type: 'cond', value: closed[v] === 1, at: 'closedCheck' };
      if (closed[v]) { // @closedCheck
        yield { type: 'skipClosed', node: v, at: 'skipClosed' };
        continue; // @skipClosed
      }
      const nd = dist[u] + w; // @nd
      yield { type: 'calc', value: nd, at: 'nd' };
      yield { type: 'compare', node: v, newG: nd, oldG: dist[v], better: nd < dist[v], at: 'compare' };
      if (nd < dist[v]) { // @compare
        dist[v] = nd; // @setG
        yield { type: 'setG', node: v, g: nd, at: 'setG' };
        prev[v] = u; // @setPrev
        yield { type: 'setPrev', node: v, prev: u, at: 'setPrev' };
        pq.push(v, nd); // @relax
        yield { type: 'push', node: v, g: nd, f: nd, at: 'relax' };
      }
    }
    yield { type: 'edgesDone', node: u, at: 'edgesDone' };
  }

  yield { type: 'fail', at: 'loopEnd' };
}
