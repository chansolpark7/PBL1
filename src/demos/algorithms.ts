import { astar } from '../algo/astar';
import { dijkstra } from '../algo/dijkstra';
import type { Heuristic, SearchGenerator } from '../algo/graph';
import { dist, type GeoGraph } from '../graphs/generate';

export type AlgoKey = 'dijkstra' | 'weak' | 'over' | 'good';

export interface AlgoOption {
  label: string; // full name (step-through dropdown)
  short: string; // name in the compare view's "bad heuristic" dropdown
  title: string; // panel title in the compare view
  desc: string; // one-line explanation
  kind: 'dijkstra' | 'astar';
  h: Heuristic; // h = 0 for Dijkstra
  make: () => SearchGenerator;
}

/** The algorithm/heuristic combinations shown on a coordinate graph. */
export function graphAlgorithms(g: GeoGraph): Record<AlgoKey, AlgoOption> {
  const s = g.start;
  const t = g.goal;
  // Straight-line heuristic: every edge costs ≥ length/unit, so it never exceeds the true cost (admissible)
  const good: Heuristic = (v) => dist(g.pos[v], g.pos[t]) / g.unit;
  const weak: Heuristic = (v) => 0.3 * good(v);
  const over: Heuristic = (v) => 3 * good(v);

  return {
    dijkstra: {
      label: 'Dijkstra',
      short: 'Dijkstra',
      title: 'Dijkstra',
      desc: 'h = 0 — settles nodes in order of distance from the start',
      kind: 'dijkstra',
      h: () => 0,
      make: () => dijkstra(g, s, t),
    },
    weak: {
      label: 'A* · weak heuristic (0.3 × straight-line)',
      short: 'Weak heuristic (0.3 × straight-line)',
      title: 'A* · Bad heuristic',
      desc: 'h = 0.3 × straight-line distance — far below the true cost → still optimal, but explores almost as widely as Dijkstra',
      kind: 'astar',
      h: weak,
      make: () => astar(g, s, t, weak),
    },
    over: {
      label: 'A* · overestimating heuristic (3 × straight-line)',
      short: 'Overestimating heuristic (3 × straight-line)',
      title: 'A* · Bad heuristic',
      desc: 'h = 3 × straight-line distance — exceeds the true cost (not admissible) → fast, but the path is not guaranteed to be shortest',
      kind: 'astar',
      h: over,
      make: () => astar(g, s, t, over),
    },
    good: {
      label: 'A* · straight-line heuristic',
      short: 'Straight-line heuristic',
      title: 'A* · Good heuristic',
      desc: 'h = straight-line distance — the tightest estimate that never exceeds the true cost',
      kind: 'astar',
      h: good,
      make: () => astar(g, s, t, good),
    },
  };
}
