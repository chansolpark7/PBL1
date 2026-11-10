import astarSrc from '../algo/astar.ts?raw';
import dijkstraSrc from '../algo/dijkstra.ts?raw';
import type { Step } from '../algo/graph';
import type { HeapEntry } from '../algo/heap';
import { NodeState, SearchRun } from '../algo/run';
import type { GeoGraph } from '../graphs/generate';
import { CodeView } from '../ui/codeView';
import { fmt, GraphView, type GraphViewOptions } from '../ui/graphView';
import { HeapView } from '../ui/heapView';
import { Player } from '../ui/player';
import { graphAlgorithms, type AlgoKey } from './algorithms';

export interface InspectorConfig {
  description: string; // HTML
  graph: GeoGraph;
  view: GraphViewOptions;
  speed: number; // default playback speed (lines per second)
  heapLevels: number; // how many heap levels to draw as a tree
  wideHeap?: boolean; // put the heap panel in its own full-width row (for deep trees)
}

/** Local variables of the algorithm, reconstructed from its events for the "Variables" table. */
interface Locals {
  u?: number;
  key?: number;
  v?: number;
  w?: number;
  nd?: number;
  fv?: number;
}

/**
 * Debugger-style view of one algorithm on a fixed graph:
 * each step runs one line of the real source, and the graph, the binary heap and the variables update with it.
 */
export function mountInspector(root: HTMLElement, cfg: InspectorConfig): void {
  const g = cfg.graph;
  const algos = graphAlgorithms(g);
  let key: AlgoKey = 'dijkstra';

  const L = (v: number) => g.labels[v];
  const B = (v: number) => `<b>${L(v)}</b>`;
  const num = (x: number) => (x === Infinity ? '∞' : fmt(x));

  const heapPanel = `
    <div class="panel">
      <h3>Priority queue — binary min-heap <span class="h3-sub heap-key"></span></h3>
      <div class="heap-slot"></div>
    </div>`;

  root.innerHTML = `
    <div class="intro">${cfg.description}</div>
    <div class="toolbar">
      <label class="select">Algorithm
        <select class="algo">${(Object.keys(algos) as AlgoKey[])
          .map((k) => `<option value="${k}">${algos[k].label}</option>`)
          .join('')}</select>
      </label>
    </div>
    <div class="toolbar">
      <div class="player-slot"></div>
      <button class="next-settle">⏭ Next settled node</button>
    </div>
    <div class="legend">
      <span><i class="dot start"></i>Start</span>
      <span><i class="dot goal"></i>Goal</span>
      <span><i class="dot frontier"></i>In queue</span>
      <span><i class="dot closed"></i>Settled</span>
      <span><i class="dot current"></i>Being expanded (u)</span>
      <span><i class="dot focus"></i>Node the step is about</span>
      <span><i class="bar examining"></i>Edge being examined</span>
      <span><i class="bar path"></i>Path found</span>
    </div>
    <div class="inspector">
      <div class="col">
        <div class="panel"><h3>Graph</h3><div class="svg-wrap"></div></div>
        ${cfg.wideHeap ? '' : heapPanel}
      </div>
      <div class="col">
        <div class="panel code-panel"><div class="code-slot"></div></div>
        <div class="panel">
          <h3>Current step</h3>
          <p class="explain"></p>
          <table class="vars"></table>
        </div>
      </div>
    </div>
    ${cfg.wideHeap ? `<div class="wide-heap">${heapPanel}</div>` : ''}
    <h3 class="section-title">Key optimizations in this implementation</h3>
    <div class="opt-cards"></div>`;

  const graphView = new GraphView(g, { ...cfg.view, showFocus: true });
  root.querySelector('.svg-wrap')!.appendChild(graphView.el);
  const heapView = new HeapView(L, cfg.heapLevels);
  root.querySelector('.heap-slot')!.appendChild(heapView.el);
  const codeViews = {
    dijkstra: new CodeView(dijkstraSrc, 'dijkstra.ts'),
    astar: new CodeView(astarSrc, 'astar.ts'),
  };
  const codeSlot = root.querySelector('.code-slot')!;
  codeSlot.append(codeViews.dijkstra.el, codeViews.astar.el);

  const explainEl = root.querySelector<HTMLElement>('.explain')!;
  const varsEl = root.querySelector<HTMLElement>('.vars')!;
  const cardsEl = root.querySelector<HTMLElement>('.opt-cards')!;
  const heapKeyEl = root.querySelector<HTMLElement>('.heap-key')!;

  let run!: SearchRun;
  let loc: Locals = {};
  let shownVars = new Map<string, string>();

  /** An entry is stale if its node is already settled or a newer entry with a smaller key exists. */
  const isStale = (e: HeapEntry<number>) => run.state[e.item] === NodeState.Closed || e.key > run.f[e.item] + 1e-9;

  const track = (s: Step) => {
    if (s.type === 'pop') loc = { u: s.node, key: s.key };
    else if (s.type === 'edge') loc = { u: loc.u, key: loc.key, v: s.to, w: s.w };
    else if (s.type === 'edgesDone') loc = { u: loc.u, key: loc.key };
    else if (s.type === 'calc' && s.at === 'nd') loc.nd = s.value;
    else if (s.type === 'calc' && s.at === 'fv') loc.fv = s.value;
  };

  /** One sentence about the line that just ran, with the actual values plugged in. */
  const explain = (): string => {
    const s = run.lastStep;
    const a = algos[key];
    const isA = a.kind === 'astar';
    const K = isA ? 'f' : 'd';
    const G = isA ? 'g' : 'dist';
    const ND = isA ? 'ng' : 'nd';
    const TF = (b: boolean) => (b ? '<b class="ok">true</b>' : '<b class="bad">false</b>');
    const u = loc.u ?? -1;
    const v = loc.v ?? -1;
    if (!s) return 'Press <b>Step (1 line)</b> to run the first line. Every step runs exactly one line of the real code.';
    switch (s.type) {
      case 'line':
        if (s.at === 'opts') return 'Read the options: on equal f, the entry with the smaller h comes out first (tie-breaking is on by default).';
        if (s.at === 'n') return `n = ${g.n} nodes.`;
        if (s.at === 'dist') return `${G}[] = ∞ for every node — the best known ${isA ? 'cost' : 'distance'} from the start so far.`;
        if (s.at === 'prev') return 'prev[] = −1 for every node — remembers the previous node on the best path, to rebuild the path at the end.';
        if (s.at === 'closed') return 'closed[] = 0 for every node — becomes 1 once a node is settled (its cost is final).';
        return '';
      case 'init':
        return `pq = an empty binary min-heap — the priority queue. Its key is ${isA ? 'f = g + h' : 'the distance d'}.`;
      case 'setG':
        if (s.at === 'g0') return `${G}[${B(s.node)}] = 0 — the start is at ${isA ? 'cost' : 'distance'} 0 from itself.`;
        return `${G}[${B(s.node)}] = ${num(s.g)} — the new best ${isA ? 'cost' : 'distance'} to ${B(s.node)}.`;
      case 'setPrev':
        return `prev[${B(s.node)}] = ${B(s.prev)} — the best path to ${B(s.node)} now arrives from ${B(s.prev)}.`;
      case 'calc':
        if (s.at === 'fv') return `fv = ng + h(v) = ${num(loc.nd!)} + ${num(a.h(v))} = ${num(s.value)} — the priority of ${B(v)} in the heap.`;
        return `${ND} = ${G}[u] + w = ${num(run.g[u])} + ${num(loc.w!)} = ${num(s.value)} — the cost of reaching ${B(v)} through ${B(u)}.`;
      case 'cond': {
        const verdict = (yes: string, no: string) => ` → ${TF(s.value)} — ${s.value ? yes : no}`;
        if (s.at === 'loop') return `pq.size > 0? ${run.heap!.size} > 0` + verdict('keep looping.', '');
        if (s.at === 'staleCheck') {
          const c = run.state[u] === NodeState.Closed ? 1 : 0;
          const test = isA ? `closed[u]? ${c}` : `closed[u] || d > dist[u]? ${c} || ${num(loc.key!)} > ${num(run.g[u])}`;
          return test + verdict('this entry is outdated.', 'a valid entry, go on.');
        }
        if (s.at === 'goalCheck') return `u === goal? ${B(u)} === ${B(g.goal)}` + verdict('the goal is reached.', 'keep searching.');
        if (s.at === 'closedCheck') return `closed[v]? closed[${B(v)}] = ${s.value ? 1 : 0}` + verdict('already settled.', 'not settled yet.');
        return '';
      }
      case 'compare':
        return `${ND} < ${G}[v]? ${num(s.newG)} < ${num(s.oldG)} → ${TF(s.better)} — ${s.better ? `a shorter path to ${B(s.node)} was found, update it.` : 'not shorter, skip.'}`;
      case 'push':
        if (s.at === 'start') {
          return isA
            ? `pq.push(${B(s.node)}, h(${B(s.node)}) = ${num(s.f)}) — the start goes into the heap with f = 0 + h.`
            : `pq.push(${B(s.node)}, 0) — the start goes into the heap with key 0.`;
        }
        return (
          `pq.push(${B(s.node)}, ${num(s.f)}) — add ${B(s.node)} to the heap with key ${num(s.f)}.` +
          (run.lastPushWasUpdate
            ? ` ${B(s.node)} was already in the heap with a larger key. Instead of a costly <i>decrease-key</i>, the old entry is left behind as a <i>stale</i> entry.`
            : '')
        );
      case 'pop':
        return `pq.pop() takes the root — the entry with the smallest key: u = ${B(s.node)}, ${K} = ${num(s.key)}.`;
      case 'stale':
        return `continue — <b>lazy deletion</b>: skip the outdated entry of ${B(s.node)} and go back to the while check.`;
      case 'visit':
        return `closed[${B(s.node)}] = 1 — settled: no shorter path to it can appear anymore, so ${G}[${B(s.node)}] = ${num(s.g)} is final.`;
      case 'edge':
        return `Next neighbor of ${B(s.from)}: v = ${B(s.to)}, w = ${num(s.w)}.`;
      case 'edgesDone':
        return `No more neighbors of ${B(s.node)} — the for loop ends; back to the while check.`;
      case 'skipClosed':
        return `continue — ${B(s.node)} is already settled, skip this edge.`;
      case 'done':
        return `return — the goal's cost ${num(s.cost)} is final. <b>Early exit</b>: the remaining nodes are never settled. Path: ${s.path.map(B).join(' → ')}.`;
      case 'fail':
        return `pq.size > 0? 0 > 0 → ${TF(false)} — the heap is empty, the goal cannot be reached.`;
    }
  };

  const variables = (): [string, string][] => {
    const a = algos[key];
    const isA = a.kind === 'astar';
    const node = (x?: number) => (x === undefined ? '—' : L(x));
    const val = (x?: number) => (x === undefined ? '—' : num(x));
    const v = loc.v;
    const rows: [string, string][] = [
      ['u', node(loc.u)],
      [isA ? 'f' : 'd', val(loc.key)],
      ['v', node(v)],
      ['w', val(loc.w)],
      [isA ? 'ng' : 'nd', val(loc.nd)],
    ];
    if (isA) rows.push(['h(v)', v === undefined ? '—' : num(a.h(v))], ['fv', val(loc.fv)]);
    rows.push(
      [isA ? 'g[v]' : 'dist[v]', v === undefined ? '—' : num(run.g[v])],
      ['prev[v]', v === undefined ? '—' : run.prev[v] === -1 ? '−1' : L(run.prev[v])],
      ['pq.size', run.heap ? String(run.heap.size) : '—'],
    );
    return rows;
  };

  const renderCards = () => {
    const t = run.lastStep?.type;
    const heap = run.heap;
    const staleNow = heap ? heap.entries.filter(isStale).length : 0;
    const cards = [
      {
        active: t === 'push' || t === 'pop',
        title: 'Binary heap priority queue',
        body: 'push and pop cost O(log n) each. Finding the minimum by scanning every node would cost O(V) per step, O(V²) in total.',
        stat:
          `Heap comparisons: <b>${heap?.comparisons ?? 0}</b> · swaps: <b>${heap?.swaps ?? 0}</b> · largest size: <b>${run.maxHeapSize}</b><br>` +
          `A plain-array scan would need ≈ <b>${run.visitedCount * g.n}</b> comparisons (${g.n} per settled node).`,
      },
      {
        active: t === 'stale' || (t === 'push' && run.lastPushWasUpdate),
        title: 'Lazy deletion (no decrease-key)',
        body: 'When a shorter path is found, a new entry is pushed instead of updating the old one inside the heap. Outdated entries are skipped when they are popped.',
        stat: `Stale entries in the heap now: <b>${staleNow}</b> · skipped so far: <b>${run.staleSkipped}</b>`,
      },
      {
        active: t === 'skipClosed',
        title: 'Closed set',
        body: "A settled node's cost is final, so edges into it are skipped with no arithmetic and no heap work.",
        stat: `Edges skipped: <b>${run.closedSkipped}</b>`,
      },
      {
        active: t === 'done',
        title: 'Early exit',
        body: 'Stop as soon as the goal is popped instead of computing the distance to every node.',
        stat: run.found
          ? `Stopped with <b>${g.n - run.visitedCount}</b> of ${g.n} nodes never settled.`
          : `Settled so far: <b>${run.visitedCount}</b> / ${g.n}`,
      },
    ];
    if (algos[key].kind === 'astar') {
      cards.push({
        active: (t === 'calc' && run.lastStep?.at === 'fv') || t === 'push',
        title: 'Heuristic key (A*)',
        body: 'The heap is ordered by f = g + h, so nodes that look closer to the goal come out first. Ties on f go to the smaller h.',
        stat: `Nodes settled: <b>${run.visitedCount}</b> / ${g.n}`,
      });
    }
    cardsEl.innerHTML = cards
      .map((c) => `<div class="opt-card${c.active ? ' active' : ''}"><h4>${c.title}</h4><p>${c.body}</p><div class="opt-stat">${c.stat}</div></div>`)
      .join('');
  };

  const render = () => {
    const a = algos[key];
    const s = run.lastStep;
    graphView.render(run);
    heapView.render(run.heap, isStale, s?.type === 'push' || s?.type === 'pop');
    codeViews[a.kind].highlight(s?.at ?? null);
    explainEl.innerHTML = explain();

    const rows = variables();
    varsEl.innerHTML = rows
      .map(([name, value]) => {
        const changed = shownVars.has(name) && shownVars.get(name) !== value ? ' class="changed"' : '';
        return `<tr${changed}><td>${name}</td><td>${value}</td></tr>`;
      })
      .join('');
    shownVars = new Map(rows);
    renderCards();
  };

  const player = new Player(
    {
      reset: () => {
        const a = algos[key];
        run = new SearchRun(g.n, a.make());
        loc = {};
        shownVars = new Map();
        codeViews.dijkstra.el.hidden = a.kind !== 'dijkstra';
        codeViews.astar.el.hidden = a.kind !== 'astar';
        heapKeyEl.textContent = a.kind === 'astar' ? 'key = f = g + h' : 'key = dist';
      },
      step: () => {
        const s = run.advance();
        if (s) track(s);
        return !run.finished;
      },
      render,
    },
    { speed: cfg.speed, stepLabel: 'Step (1 line)' },
  );
  root.querySelector('.player-slot')!.appendChild(player.el);

  root.querySelector<HTMLButtonElement>('.next-settle')!.onclick = () => player.stepUntil(() => run.lastStep?.type === 'visit');
  root.querySelector<HTMLSelectElement>('select.algo')!.onchange = (e) => {
    key = (e.target as HTMLSelectElement).value as AlgoKey;
    player.reset();
  };

  player.reset();
}
