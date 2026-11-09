import './style.css';
import { mountGraphDemo } from './demos/graphDemo';
import { mountGridDemo } from './demos/gridDemo';
import { makeGeoGraph } from './graphs/generate';

// ① Small graph: for explanation — shows node names, edge weights and f values
const smallGraph = makeGeoGraph({
  n: 16,
  width: 640,
  height: 400,
  margin: 40,
  minDist: 95,
  k: 3,
  unit: 20,
  clearance: 22,
  slowProb: 0.25,
  slowMin: 2,
  slowMax: 3,
  seed: 7, // change the seed to get a different graph
});

// ② Large graph: makes the difference in search area visible at a glance
const largeGraph = makeGeoGraph({
  n: 450,
  width: 1000,
  height: 600,
  margin: 15,
  minDist: 26,
  k: 6,
  unit: 1, // smaller unit → less rounding error, so the straight-line heuristic is more accurate
  clearance: 6,
  slowProb: 0.05, // more congested edges make straight-line distance less accurate, shrinking A*'s advantage
  slowMin: 2,
  slowMax: 4,
  seed: 42,
});

mountGraphDemo(document.getElementById('tab-small')!, {
  description: `<p>A small graph with ${smallGraph.n} nodes. Numbers on edges are costs; dashed edges are <i>congested</i> (more expensive than their straight-line length).
    The value under each node is its priority-queue key <b>f = g + h</b> (for Dijkstra h = 0, so f = g).
    <b>One step = each algorithm settles one node</b>, so you can compare which one reaches the goal first.</p>`,
  graph: smallGraph,
  view: { nodeR: 14, showLabels: true, showWeights: true, showValues: true },
  speed: 2,
});

mountGraphDemo(document.getElementById('tab-large')!, {
  description: `<p>A large graph with ${largeGraph.n} nodes. Dijkstra spreads out in a circle around the start,
    while A* with a good heuristic searches a narrow band toward the goal. The bigger the graph, the bigger the gap.</p>`,
  graph: largeGraph,
  view: { nodeR: 4.5, showLabels: false, showWeights: false, showValues: false },
  speed: 60,
});

mountGridDemo(document.getElementById('tab-grid')!);

// Tab switching
const tabs = document.getElementById('tabs')!;
tabs.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-tab]');
  if (!btn) return;
  tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${btn.dataset.tab}`));
});
