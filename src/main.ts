import './style.css';
import { mountGraphDemo, type GraphDemoConfig } from './demos/graphDemo';
import { mountGridDemo } from './demos/gridDemo';
import { mountInspector, type InspectorConfig } from './demos/inspector';
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
  // Seed chosen so the example shows every case: stale entries skipped by lazy deletion (Dijkstra and A*),
  // a clear A* advantage, and a suboptimal path from the overestimating heuristic. Change it for a different graph.
  seed: 34,
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

/** A graph tab has two views: the side-by-side comparison and the step-through (code + heap) inspector. */
function mountGraphTab(tab: HTMLElement, compare: GraphDemoConfig, inspect: InspectorConfig) {
  tab.innerHTML = `
    <div class="subtabs">
      <button data-view="compare" class="active">Compare all three</button>
      <button data-view="inspect">Step through code &amp; heap</button>
    </div>
    <div class="view active" data-view="compare"></div>
    <div class="view" data-view="inspect"></div>`;
  const [compareEl, inspectEl] = tab.querySelectorAll<HTMLElement>('div.view');
  mountGraphDemo(compareEl, compare);
  mountInspector(inspectEl, inspect);

  const subtabs = tab.querySelector<HTMLElement>('.subtabs')!;
  subtabs.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-view]');
    if (!btn) return;
    subtabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    tab.querySelectorAll<HTMLElement>('div.view').forEach((v) => v.classList.toggle('active', v.dataset.view === btn.dataset.view));
  });
}

const smallView = { nodeR: 14, showLabels: true, showWeights: true, showValues: true };
const largeView = { nodeR: 4.5, showLabels: false, showWeights: false, showValues: false };

mountGraphTab(
  document.getElementById('tab-small')!,
  {
    description: `<p>A small graph with ${smallGraph.n} nodes. Numbers on edges are costs; dashed edges are <i>congested</i> (more expensive than their straight-line length).
      The value under each node is its priority-queue key <b>f = g + h</b> (for Dijkstra h = 0, so f = g).
      <b>One step = each algorithm settles one node</b>, so you can compare which one reaches the goal first.</p>`,
    graph: smallGraph,
    view: smallView,
    speed: 2,
  },
  {
    description: `<p>Run the real implementation one line at a time, like a debugger. The <b>highlighted line has just executed</b>.
      The heap panel draws the actual <code>MinHeap</code> object the code is using: watch <code>push</code> sift up, <code>pop</code> sift down,
      and outdated entries pile up until they are skipped (lazy deletion).</p>`,
    graph: smallGraph,
    view: smallView,
    speed: 2,
    heapLevels: 5,
  },
);

mountGraphTab(
  document.getElementById('tab-large')!,
  {
    description: `<p>A large graph with ${largeGraph.n} nodes. Dijkstra spreads out in a circle around the start,
      while A* with a good heuristic searches a narrow band toward the goal. The bigger the graph, the bigger the gap.</p>`,
    graph: largeGraph,
    view: largeView,
    speed: 60,
  },
  {
    description: `<p>The same step-through on the ${largeGraph.n}-node graph. Use <b>Next settled node</b> or raise the speed to move faster.
      Only the top levels of the heap fit in the tree; the full array is listed below it. Node names are their index numbers.</p>`,
    graph: largeGraph,
    view: { ...largeView, nodeR: 5 },
    speed: 20,
    heapLevels: 6, // up to 63 entries: the whole heap fits for Dijkstra and the weak/overestimating heuristics
    wideHeap: true, // a 6-level tree needs the full page width to stay readable
  },
);

mountGridDemo(document.getElementById('tab-grid')!);

// Tab switching
const tabs = document.getElementById('tabs')!;
tabs.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-tab]');
  if (!btn) return;
  tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${btn.dataset.tab}`));
});
