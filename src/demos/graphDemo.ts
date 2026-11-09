import { astar } from '../algo/astar';
import { dijkstra } from '../algo/dijkstra';
import type { Heuristic, SearchGenerator } from '../algo/graph';
import { SearchRun } from '../algo/run';
import { dist, type GeoGraph } from '../graphs/generate';
import { fmt, GraphView, type GraphViewOptions } from '../ui/graphView';
import { Player } from '../ui/player';

export interface GraphDemoConfig {
  description: string; // HTML
  graph: GeoGraph;
  view: GraphViewOptions;
  speed: number; // default playback speed (steps per second)
}

interface Panel {
  title: string;
  subtitle: () => string;
  make: () => SearchGenerator;
  view: GraphView;
  stats: HTMLElement;
  run?: SearchRun;
}

/**
 * Runs three algorithms side by side on a fixed graph for comparison.
 *  ① Dijkstra  ② A* (bad heuristic)  ③ A* (good heuristic = straight-line distance)
 * One step = each algorithm settles one node → you can compare how close each one got to the goal at the same step.
 */
export function mountGraphDemo(root: HTMLElement, cfg: GraphDemoConfig): void {
  const g = cfg.graph;
  const s = g.start;
  const t = g.goal;

  // Straight-line heuristic: every edge costs ≥ length/unit, so it never exceeds the true cost (admissible)
  const hGood: Heuristic = (v) => dist(g.pos[v], g.pos[t]) / g.unit;
  const badHeuristics: Record<string, { label: string; desc: string; h: Heuristic }> = {
    weak: {
      label: 'Weak heuristic (0.3 × straight-line)',
      desc: 'h = 0.3 × straight-line distance — far below the true cost → still optimal, but explores almost as widely as Dijkstra',
      h: (v) => 0.3 * hGood(v),
    },
    over: {
      label: 'Overestimating heuristic (3 × straight-line)',
      desc: 'h = 3 × straight-line distance — exceeds the true cost (not admissible) → fast, but the path is not guaranteed to be shortest',
      h: (v) => 3 * hGood(v),
    },
  };
  let badKey = 'weak';

  // Optimal cost (reference for checking each result)
  const ref = new SearchRun(g.n, dijkstra(g, s, t));
  ref.runToEnd();
  const optimal = ref.cost;

  root.innerHTML = `
    <div class="intro">${cfg.description}</div>
    <div class="toolbar">
      <div class="player-slot"></div>
      <label class="select">Bad heuristic
        <select>${Object.entries(badHeuristics)
          .map(([k, b]) => `<option value="${k}">${b.label}</option>`)
          .join('')}</select>
      </label>
    </div>
    <div class="legend">
      <span><i class="dot start"></i>Start</span>
      <span><i class="dot goal"></i>Goal</span>
      <span><i class="dot frontier"></i>In queue (frontier)</span>
      <span><i class="dot closed"></i>Settled (visited)</span>
      <span><i class="dot current"></i>Just settled</span>
      <span><i class="bar path"></i>Path found</span>
      <span><i class="bar slow"></i>Congested (costly edge)</span>
    </div>
    <div class="panels"></div>`;

  const panelsEl = root.querySelector<HTMLElement>('.panels')!;
  const panels: Panel[] = [
    { title: 'Dijkstra', subtitle: () => 'h = 0 — settles nodes in order of distance from the start', make: () => dijkstra(g, s, t) },
    { title: 'A* · Bad heuristic', subtitle: () => badHeuristics[badKey].desc, make: () => astar(g, s, t, badHeuristics[badKey].h) },
    { title: 'A* · Good heuristic', subtitle: () => 'h = straight-line distance — the tightest estimate that never exceeds the true cost', make: () => astar(g, s, t, hGood) },
  ].map((p) => {
    const box = document.createElement('div');
    box.className = 'panel';
    box.innerHTML = `<h3>${p.title}</h3><p class="sub"></p><div class="svg-wrap"></div><div class="stats"></div>`;
    const view = new GraphView(g, cfg.view);
    box.querySelector('.svg-wrap')!.appendChild(view.el);
    panelsEl.appendChild(box);
    return { ...p, view, stats: box.querySelector<HTMLElement>('.stats')! };
  });

  const renderSubtitles = () => {
    panelsEl.querySelectorAll<HTMLElement>('.panel .sub').forEach((el, i) => (el.textContent = panels[i].subtitle()));
  };

  const renderStats = (p: Panel) => {
    const r = p.run!;
    let status = 'Searching…';
    let cost = '—';
    if (r.finished && r.found) {
      status = 'Done';
      const diff = r.cost - optimal;
      cost =
        diff < 1e-9
          ? `${fmt(r.cost)} <b class="ok">✓ optimal</b>`
          : `${fmt(r.cost)} <b class="bad">✗ ${fmt(diff)} longer than optimal (${fmt(optimal)})</b>`;
    } else if (r.finished) status = 'No path';
    p.stats.innerHTML = `
      <div><span>Nodes settled</span><b>${r.visitedCount}</b> / ${g.n} (${Math.round((r.visitedCount / g.n) * 100)}%)</div>
      <div><span>Queue pushes</span><b>${r.pushCount}</b></div>
      <div><span>Path cost</span>${cost}</div>
      <div><span>Status</span>${status}</div>`;
  };

  const player = new Player(
    {
      reset: () => {
        for (const p of panels) p.run = new SearchRun(g.n, p.make());
        renderSubtitles();
      },
      step: () => {
        for (const p of panels) if (!p.run!.finished) p.run!.expand();
        return panels.some((p) => !p.run!.finished);
      },
      render: () => {
        for (const p of panels) {
          p.view.render(p.run!);
          renderStats(p);
        }
      },
    },
    { speed: cfg.speed },
  );
  root.querySelector('.player-slot')!.appendChild(player.el);

  root.querySelector<HTMLSelectElement>('.toolbar select')!.onchange = (e) => {
    badKey = (e.target as HTMLSelectElement).value;
    player.reset();
  };

  player.reset();
}
