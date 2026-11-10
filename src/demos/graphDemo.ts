import { SearchRun } from '../algo/run';
import type { GeoGraph } from '../graphs/generate';
import { fmt, GraphView, type GraphViewOptions } from '../ui/graphView';
import { Player } from '../ui/player';
import { graphAlgorithms, type AlgoKey, type AlgoOption } from './algorithms';

export interface GraphDemoConfig {
  description: string; // HTML
  graph: GeoGraph;
  view: GraphViewOptions;
  speed: number; // default playback speed (steps per second)
}

interface Panel {
  algo: () => AlgoOption;
  view: GraphView;
  title: HTMLElement;
  sub: HTMLElement;
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
  const algos = graphAlgorithms(g);
  let badKey: AlgoKey = 'weak';

  // Optimal cost (reference for checking each result)
  const ref = new SearchRun(g.n, algos.dijkstra.make());
  ref.runToEnd();
  const optimal = ref.cost;

  root.innerHTML = `
    <div class="intro">${cfg.description}</div>
    <div class="toolbar">
      <div class="player-slot"></div>
      <label class="select">Bad heuristic
        <select>${(['weak', 'over'] as const).map((k) => `<option value="${k}">${algos[k].short}</option>`).join('')}</select>
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
  const panels: Panel[] = [() => algos.dijkstra, () => algos[badKey], () => algos.good].map((algo) => {
    const box = document.createElement('div');
    box.className = 'panel';
    box.innerHTML = `<h3></h3><p class="sub"></p><div class="svg-wrap"></div><div class="stats"></div>`;
    const view = new GraphView(g, cfg.view);
    box.querySelector('.svg-wrap')!.appendChild(view.el);
    panelsEl.appendChild(box);
    return {
      algo,
      view,
      title: box.querySelector('h3')!,
      sub: box.querySelector('.sub')!,
      stats: box.querySelector<HTMLElement>('.stats')!,
    };
  });

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
        for (const p of panels) {
          const a = p.algo();
          p.run = new SearchRun(g.n, a.make());
          p.title.textContent = a.title;
          p.sub.textContent = a.desc;
        }
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
    badKey = (e.target as HTMLSelectElement).value as AlgoKey;
    player.reset();
  };

  player.reset();
}
