import { astar } from '../algo/astar';
import { dijkstra } from '../algo/dijkstra';
import type { Edge, Graph, Heuristic, SearchGenerator } from '../algo/graph';
import { NodeState, SearchRun } from '../algo/run';
import { Player } from '../ui/player';

// Rows/columns must be odd for the maze generator
const ROWS = 25;
const COLS = 49;
const CELL = 20; // cell size in canvas pixels (CSS scales the canvas to fit the screen)

const EMPTY = 0;
const WALL = 1;
const MUD = 2;
const MUD_COST = 5;

const COLORS = {
  bg: '#ffffff',
  gridLine: '#e5e7eb',
  wall: '#334155',
  mud: '#e9dcc4',
  mudDot: '#a16207',
  frontier: '#bbf7d0',
  closed: '#bfdbfe',
  current: '#2563eb',
  path: '#f59e0b',
  start: '#16a34a',
  goal: '#dc2626',
};

const idx = (r: number, c: number) => r * COLS + c;
const rowOf = (i: number) => Math.floor(i / COLS);
const colOf = (i: number) => i % COLS;

interface Side {
  title: string;
  make: (graph: Graph) => SearchGenerator;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  stats: HTMLElement;
  run?: SearchRun;
}

export function mountGridDemo(root: HTMLElement): void {
  const cells = new Uint8Array(ROWS * COLS);
  let start = idx(12, 8);
  let goal = idx(12, 40);
  let brush = WALL;
  let heurKey = 'manhattan';
  let tieBreak = true;

  const manhattan = (v: number) => Math.abs(rowOf(v) - rowOf(goal)) + Math.abs(colOf(v) - colOf(goal));
  const heuristics: Record<string, { label: string; h: Heuristic }> = {
    manhattan: { label: 'Manhattan distance (good)', h: manhattan },
    euclid: { label: 'Euclidean distance (looser)', h: (v) => Math.hypot(rowOf(v) - rowOf(goal), colOf(v) - colOf(goal)) },
    zero: { label: 'h = 0 (same as Dijkstra)', h: () => 0 },
    over: { label: '3 × Manhattan (overestimates)', h: (v) => 3 * manhattan(v) },
  };

  root.innerHTML = `
    <div class="intro">
      <p>Moves are up/down/left/right only, and entering a cell costs 1 (mud costs ${MUD_COST}). When every cost is 1, Dijkstra spreads out
      in a diamond just like BFS, while A* uses its heuristic to head toward the goal.</p>
      <p class="hint">Drag over empty cells to paint with the brush; drag over cells of the same type to erase them. Drag <b>S</b> and <b>G</b> to move them.
      After a search has run to the end, any edit to the grid re-runs it instantly.</p>
    </div>
    <div class="toolbar">
      <div class="player-slot"></div>
    </div>
    <div class="toolbar">
      <div class="group">Brush
        <label><input type="radio" name="brush" value="${WALL}" checked> Wall</label>
        <label><input type="radio" name="brush" value="${MUD}"> Mud (cost ${MUD_COST})</label>
      </div>
      <label class="select">A* heuristic
        <select class="heur">${Object.entries(heuristics)
          .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
          .join('')}</select>
      </label>
      <label class="check"><input type="checkbox" class="tie" checked> A* tie-break: on equal f, prefer smaller h</label>
      <div class="group presets">
        <button data-preset="clear">Clear</button>
        <button data-preset="random">Random walls</button>
        <button data-preset="maze">Maze</button>
        <button data-preset="trap">U-shaped trap</button>
      </div>
    </div>
    <div class="legend">
      <span><i class="dot start"></i>Start S</span>
      <span><i class="dot goal"></i>Goal G</span>
      <span><i class="sq wall"></i>Wall</span>
      <span><i class="sq mud"></i>Mud</span>
      <span><i class="sq frontier"></i>In queue</span>
      <span><i class="sq closed"></i>Settled (visited)</span>
      <span><i class="sq path"></i>Path found</span>
    </div>
    <div class="panels two"></div>`;

  const panelsEl = root.querySelector<HTMLElement>('.panels')!;
  const sides: Side[] = [
    { title: 'Dijkstra', make: (G: Graph) => dijkstra(G, start, goal) },
    { title: 'A*', make: (G: Graph) => astar(G, start, goal, heuristics[heurKey].h, { tieBreakByH: tieBreak }) },
  ].map((s) => {
    const box = document.createElement('div');
    box.className = 'panel';
    box.innerHTML = `<h3>${s.title}</h3><canvas width="${COLS * CELL}" height="${ROWS * CELL}"></canvas><div class="stats"></div>`;
    panelsEl.appendChild(box);
    const canvas = box.querySelector('canvas')!;
    return { ...s, canvas, ctx: canvas.getContext('2d')!, stats: box.querySelector<HTMLElement>('.stats')! };
  });

  /** Converts the grid into a general graph (adjacency list). The cost of entering a cell becomes the edge weight. */
  const buildGraph = (): Graph => {
    const adj: Edge[][] = Array.from({ length: ROWS * COLS }, () => []);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const u = idx(r, c);
        if (cells[u] === WALL) continue;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
          const v = idx(nr, nc);
          if (cells[v] === WALL) continue;
          adj[u].push({ to: v, w: cells[v] === MUD ? MUD_COST : 1 });
        }
      }
    }
    return { n: ROWS * COLS, adj };
  };

  // ---------- Drawing ----------
  const draw = (side: Side) => {
    const { ctx } = side;
    const run = side.run!;
    const onPath = new Set(run.path);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    for (let i = 0; i < ROWS * COLS; i++) {
      const x = colOf(i) * CELL;
      const y = rowOf(i) * CELL;
      const type = cells[i];
      let color: string | null = null;
      if (type === WALL) color = COLORS.wall;
      else if (onPath.has(i)) color = COLORS.path;
      else if (i === run.current) color = COLORS.current;
      else if (run.state[i] === NodeState.Closed) color = COLORS.closed;
      else if (run.state[i] === NodeState.Frontier) color = COLORS.frontier;
      else if (type === MUD) color = COLORS.mud;
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, CELL, CELL);
      }
      if (type === MUD) {
        ctx.fillStyle = COLORS.mudDot;
        for (const [dx, dy] of [[0.3, 0.3], [0.7, 0.45], [0.4, 0.75]]) {
          ctx.beginPath();
          ctx.arc(x + dx * CELL, y + dy * CELL, CELL * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let r = 0; r <= ROWS; r++) {
      ctx.moveTo(0, r * CELL + 0.5);
      ctx.lineTo(COLS * CELL, r * CELL + 0.5);
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.moveTo(c * CELL + 0.5, 0);
      ctx.lineTo(c * CELL + 0.5, ROWS * CELL);
    }
    ctx.stroke();

    for (const [v, color, label] of [[start, COLORS.start, 'S'], [goal, COLORS.goal, 'G']] as const) {
      const x = colOf(v) * CELL;
      const y = rowOf(v) * CELL;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, CELL, CELL);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${CELL * 0.7}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + CELL / 2, y + CELL / 2 + 1);
    }
  };

  const renderStats = (side: Side) => {
    const r = side.run!;
    let status = 'Searching…';
    if (r.finished) status = r.found ? 'Done' : 'No path';
    const open = cells.reduce((acc, c) => acc + (c === WALL ? 0 : 1), 0);
    side.stats.innerHTML = `
      <div><span>Cells settled</span><b>${r.visitedCount}</b> / ${open}</div>
      <div><span>Queue pushes</span><b>${r.pushCount}</b></div>
      <div><span>Path cost</span>${r.found ? `<b>${r.cost}</b> (${r.path.length - 1} moves)` : '—'}</div>
      <div><span>Status</span>${status}</div>`;
  };

  // ---------- Playback ----------
  const player = new Player(
    {
      reset: () => {
        const G = buildGraph();
        for (const s of sides) s.run = new SearchRun(G.n, s.make(G));
      },
      step: () => {
        for (const s of sides) if (!s.run!.finished) s.run!.expand();
        return sides.some((s) => !s.run!.finished);
      },
      render: () => {
        for (const s of sides) {
          draw(s);
          renderStats(s);
        }
      },
    },
    { speed: 60 },
  );
  root.querySelector('.player-slot')!.appendChild(player.el);

  /** When the grid changes: re-run instantly if the search had finished, otherwise just reset */
  const onEdit = () => {
    const wasDone = player.isFinished;
    player.reset();
    if (wasDone) player.finishAll();
  };

  // ---------- Mouse editing ----------
  type Drag = { kind: 'start' | 'goal' } | { kind: 'paint'; value: number; last: number };
  let drag: Drag | null = null;

  const cellAt = (e: PointerEvent, canvas: HTMLCanvasElement): number => {
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return -1;
    return idx(r, c);
  };

  const paint = (i: number, value: number): boolean => {
    if (i === start || i === goal || cells[i] === value) return false;
    cells[i] = value;
    return true;
  };

  /** Fills the straight line between two cells so fast mouse moves don't leave gaps (Bresenham) */
  const paintLine = (from: number, to: number, value: number): boolean => {
    let r0 = rowOf(from);
    let c0 = colOf(from);
    const r1 = rowOf(to);
    const c1 = colOf(to);
    const dr = Math.abs(r1 - r0);
    const dc = Math.abs(c1 - c0);
    const sr = r0 < r1 ? 1 : -1;
    const sc = c0 < c1 ? 1 : -1;
    let err = dc - dr;
    let changed = false;
    for (;;) {
      changed = paint(idx(r0, c0), value) || changed;
      if (r0 === r1 && c0 === c1) break;
      const e2 = 2 * err;
      if (e2 > -dr) {
        err -= dr;
        c0 += sc;
      }
      if (e2 < dc) {
        err += dc;
        r0 += sr;
      }
    }
    return changed;
  };

  for (const side of sides) {
    const canvas = side.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      const i = cellAt(e, canvas);
      if (i < 0) return;
      canvas.setPointerCapture(e.pointerId);
      if (i === start) drag = { kind: 'start' };
      else if (i === goal) drag = { kind: 'goal' };
      else {
        const value = cells[i] === brush ? EMPTY : brush;
        drag = { kind: 'paint', value, last: i };
        if (paint(i, value)) onEdit();
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const i = cellAt(e, canvas);
      if (i < 0) return;
      if (drag.kind === 'paint') {
        if (i !== drag.last && paintLine(drag.last, i, drag.value)) onEdit();
        drag.last = i;
      } else if (cells[i] !== WALL && i !== start && i !== goal) {
        if (drag.kind === 'start') start = i;
        else goal = i;
        onEdit();
      }
    });
    const end = () => (drag = null);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  // ---------- Options ----------
  root.querySelectorAll<HTMLInputElement>('input[name="brush"]').forEach((el) => {
    el.onchange = () => (brush = Number(el.value));
  });
  root.querySelector<HTMLSelectElement>('select.heur')!.onchange = (e) => {
    heurKey = (e.target as HTMLSelectElement).value;
    onEdit();
  };
  root.querySelector<HTMLInputElement>('input.tie')!.onchange = (e) => {
    tieBreak = (e.target as HTMLInputElement).checked;
    onEdit();
  };

  // ---------- Presets ----------
  const presets: Record<string, () => void> = {
    clear: () => cells.fill(EMPTY),
    random: () => {
      for (let i = 0; i < cells.length; i++) cells[i] = Math.random() < 0.3 ? WALL : EMPTY;
    },
    maze: () => {
      // Recursive-backtracker maze: odd coordinates are rooms, the cells between them are walls
      cells.fill(WALL);
      const stack: [number, number][] = [[1, 1]];
      cells[idx(1, 1)] = EMPTY;
      while (stack.length) {
        const [r, c] = stack[stack.length - 1];
        const next = [[-2, 0], [2, 0], [0, -2], [0, 2]]
          .map(([dr, dc]) => [r + dr, c + dc] as [number, number])
          .filter(([nr, nc]) => nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && cells[idx(nr, nc)] === WALL);
        if (next.length === 0) {
          stack.pop();
          continue;
        }
        const [nr, nc] = next[Math.floor(Math.random() * next.length)];
        cells[idx((r + nr) / 2, (c + nc) / 2)] = EMPTY;
        cells[idx(nr, nc)] = EMPTY;
        stack.push([nr, nc]);
      }
      // Knock out some walls to create loops (multiple routes) → the choice of path actually matters
      for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
          const i = idx(r, c);
          if (cells[i] !== WALL || Math.random() > 0.1) continue;
          const horiz = cells[idx(r, c - 1)] !== WALL && cells[idx(r, c + 1)] !== WALL;
          const vert = cells[idx(r - 1, c)] !== WALL && cells[idx(r + 1, c)] !== WALL;
          if (horiz || vert) cells[i] = EMPTY;
        }
      }
      // Snap start/goal to the nearest room cell
      const snap = (v: number) => idx(Math.min(rowOf(v) | 1, ROWS - 2), Math.min(colOf(v) | 1, COLS - 2));
      start = snap(start);
      goal = snap(goal);
    },
    trap: () => {
      // A U-shaped wall around the start, closed on the goal side: the heuristic lures A* into a dead end
      cells.fill(EMPTY);
      start = idx(12, 12);
      goal = idx(12, 40);
      for (let r = 4; r <= 20; r++) cells[idx(r, 20)] = WALL;
      for (let c = 8; c <= 20; c++) {
        cells[idx(4, c)] = WALL;
        cells[idx(20, c)] = WALL;
      }
    },
  };
  root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((btn) => {
    btn.onclick = () => {
      presets[btn.dataset.preset!]();
      cells[start] = EMPTY;
      cells[goal] = EMPTY;
      onEdit();
    };
  });

  player.reset();
}
