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
  demos/
    graphDemo.ts        ①② three-way comparison on a fixed graph
    gridDemo.ts         ③ interactive grid (Canvas)
  main.ts               graph settings (seed, size) and tabs
```

Core idea: each algorithm is written as a `function*` (generator) that `yield`s `push` (added to the queue) / `visit` (settled) / `done` events,
and the rendering side draws purely from those events. One `SearchRun.expand()` call settles one node, so several algorithms can be compared at the same pace.

## Things you might want to change

- Graph shape: the `makeGeoGraph({...})` options in `src/main.ts` (`seed`, `n`, `k`, `slowProb`, ...)
- Bad heuristic variants: `badHeuristics` in `src/demos/graphDemo.ts`
- Grid size and mud cost: constants at the top of `src/demos/gridDemo.ts` (`ROWS` and `COLS` must be odd)
