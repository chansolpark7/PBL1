# Dijkstra vs A* — Shortest Path Visualizer

## Running it

All you need is [Node.js](https://nodejs.org) (LTS). TypeScript and Vite are installed into the project by `npm install` below.

```bash
npm install      # once
npm run dev      # dev server → open http://localhost:5173 in a browser
npm run build    # type-check + write deployable files to dist/
```

Upload the `dist/` folder as-is to GitHub Pages or any static host.

## Structure

```
src/
  algo/                 ← algorithms (no rendering code)
    heap.ts             binary min-heap (priority queue)
    graph.ts            shared types: Graph, Step events, path reconstruction
    dijkstra.ts         Dijkstra (generator)
    astar.ts            A* (generator)
    run.ts              SearchRun: wraps a generator and accumulates state/stats
  graphs/generate.ts    coordinate-graph generator (seeded)
  ui/
    player.ts           play / pause / step / run to end / speed controls
    graphView.ts        SVG renderer for coordinate graphs
    codeView.ts         debugger-style source view (highlights the line that just ran)
    heapView.ts         binary heap drawn as a tree + array (sift path, stale entries)
  demos/
    algorithms.ts       Dijkstra / A* heuristic options shared by the graph views
    graphDemo.ts        ①② "Compare all three" on a fixed graph
    inspector.ts        ①② "Step through code & heap": one algorithm, line by line
    gridDemo.ts         ③ interactive grid (Canvas)
  main.ts               graph settings (seed, size) and tabs
```

Core idea: each algorithm is written as a `function*` (generator) that `yield`s one event per executed line
(`pop`, `stale`, `visit`, `edge`, `compare`, `push`, `done`, …), and the rendering side draws purely from those events.

- `SearchRun.advance()` processes one event → the step-through view (one highlighted line per step)
- `SearchRun.expand()` advances until one node is settled → the compare view (all algorithms at the same pace)

The code view shows the real `dijkstra.ts` / `astar.ts` (imported with Vite's `?raw`). Every executable line is followed by a
`yield` that carries `at: 'name'` (for an `if`/`while` condition the `yield` comes right before it and reports the condition's value),
and that line is marked with `@name` at the end of its comment (`x = 1; // @name` or `x = 1; // description @name`).
The `yield` lines themselves are hidden in the view. If you edit an algorithm: keep each `yield` on its own line,
give every executable line its own label, and never put the same label on two lines (the console warns if you do).

## Things you might want to change

- Graph shape: the `makeGeoGraph({...})` options in `src/main.ts` (`seed`, `n`, `k`, `slowProb`, ...)
- Bad heuristic variants: `badHeuristics` in `src/demos/graphDemo.ts`
- Grid size and mud cost: constants at the top of `src/demos/gridDemo.ts` (`ROWS` and `COLS` must be odd)
