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
 *
 * Written as a generator (function*) so the visualizer can run it one line at a time:
 *  - after every executable line there is a `yield` that reports that line (for if/while conditions,
 *    the `yield` comes right before the condition and reports its value — conditions have no side effects);
 *  - `@name` at the end of a line's comment marks the line that the step with `at: 'name'` highlights.
 * The on-screen code view shows this file with the `yield` lines hidden.
 */
export function* astar(
  graph: Graph,
  start: number,
  goal: number,
  h: Heuristic,
  options: AStarOptions = {},
): SearchGenerator {
  const { tieBreakByH = true } = options; // @opts
  yield { type: 'line', at: 'opts' };
  const n = graph.n; // @n
  yield { type: 'line', at: 'n' };
  const g = new Float64Array(n).fill(Infinity); // best known cost @dist
  yield { type: 'line', at: 'dist' };
  const prev = new Int32Array(n).fill(-1); // previous node on that path @prev
  yield { type: 'line', at: 'prev' };
  const closed = new Uint8Array(n); // 1 = settled (final) @closed
  yield { type: 'line', at: 'closed' };
  const pq = new MinHeap<number>(); // key f = g + h; on equal f, smaller h first @init
  yield { type: 'init', heap: pq, at: 'init' };

  g[start] = 0; // @g0
  yield { type: 'setG', node: start, g: 0, at: 'g0' };
  pq.push(start, h(start), tieBreakByH ? h(start) : 0); // @start
  yield { type: 'push', node: start, g: 0, f: h(start), at: 'start' };

  while (pq.size > 0) { // @loop @loopEnd
    yield { type: 'cond', value: true, at: 'loop' };
    const { item: u, key: f } = pq.pop()!; // @pop
    yield { type: 'pop', node: u, key: f, at: 'pop' };

    // Lazy deletion: skip outdated duplicate entries
    yield { type: 'cond', value: closed[u] === 1, at: 'staleCheck' };
    if (closed[u]) { // @staleCheck
      yield { type: 'stale', node: u, at: 'stale' };
      continue; // @stale
    }
    closed[u] = 1; // @visit
    yield { type: 'visit', node: u, g: g[u], at: 'visit' };

    // Early exit: the goal's cost is final once popped
    yield { type: 'cond', value: u === goal, at: 'goalCheck' };
    if (u === goal) { // @goalCheck
      yield { type: 'done', path: reconstructPath(prev, goal), cost: g[goal], at: 'done' };
      return; // @done
    }

    for (const { to: v, w } of graph.adj[u]) { // @edge @edgesDone
      yield { type: 'edge', from: u, to: v, w, at: 'edge' };
      yield { type: 'cond', value: closed[v] === 1, at: 'closedCheck' };
      if (closed[v]) { // @closedCheck
        yield { type: 'skipClosed', node: v, at: 'skipClosed' };
        continue; // @skipClosed
      }
      const ng = g[u] + w; // @nd
      yield { type: 'calc', value: ng, at: 'nd' };
      yield { type: 'compare', node: v, newG: ng, oldG: g[v], better: ng < g[v], at: 'compare' };
      if (ng < g[v]) { // @compare
        g[v] = ng; // @setG
        yield { type: 'setG', node: v, g: ng, at: 'setG' };
        prev[v] = u; // @setPrev
        yield { type: 'setPrev', node: v, prev: u, at: 'setPrev' };
        const fv = ng + h(v); // @fv
        yield { type: 'calc', value: fv, at: 'fv' };
        pq.push(v, fv, tieBreakByH ? h(v) : 0); // @relax
        yield { type: 'push', node: v, g: ng, f: fv, at: 'relax' };
      }
    }
    yield { type: 'edgesDone', node: u, at: 'edgesDone' };
  }

  yield { type: 'fail', at: 'loopEnd' };
}
