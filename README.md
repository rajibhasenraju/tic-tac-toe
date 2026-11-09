# tic-tac-toe

Production-ready, responsive two-player Tic-Tac-Toe static site powered by a C11 game engine compiled to WebAssembly.

## Architecture

- **C11 engine (`src/game.c`, `src/game.h`)**: owns all game state and rules.
- **WebAssembly (`dist/game.js`, `dist/game.wasm`)**: Emscripten modularized factory export `createGameModule`.
- **UI (`public/`)**: vanilla HTML/CSS/JS for rendering, interactions, and status only.
- **CI/CD (`.github/workflows/deploy.yml`)**: native + browser/WASM tests, then GitHub Pages deployment.

## Why WebAssembly + C

The engine logic lives in one deterministic C implementation. That same implementation can be tested natively and reused in-browser via WebAssembly, preventing rule duplication.

## Engine API and semantics

State values:

- Cell: `0 = empty`, `1 = X`, `2 = O`
- Result: `0 = ongoing`, `1 = X win`, `2 = O win`, `3 = draw`
- X always starts each round and each new match.

Public C API (all exported to WASM):

- `game_init()` – resets full match and round state.
- `game_is_valid_move(index)` – returns `1` if move is legal, else `0`.
- `game_make_move(index)` – applies move if valid (`1`) else rejects (`0`).
- `game_get_cell(index)` – board value, `-1` for out-of-range.
- `game_get_current_player()` – current player marker.
- `game_get_result()` – round result value.
- `game_get_score_x()`, `game_get_score_o()`, `game_get_score_draws()` – match scoreboard.
- `game_get_winning_cell(index)` – `1` if cell belongs to winning line, `0` otherwise (`-1` out-of-range).
- `game_restart_round()` – clears board/result, keeps scores.
- `game_new_match()` – clears board/result and all scores.

Terminal rounds are counted **exactly once** inside C. Additional moves after a terminal state are always rejected and cannot increment scores again.

## Prerequisites

- C compiler with C11 support (`cc`/`clang`/`gcc`)
- Node.js 20+
- npm
- Emscripten **3.1.57** (`emcc`)

## Install Emscripten locally

One option:

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install 3.1.57
./emsdk activate 3.1.57
source ./emsdk_env.sh
```

## Build and run

```bash
npm ci
make build
```

Build outputs are generated in `dist/`:

- `dist/game.js`
- `dist/game.wasm`
- `dist/index.html`
- `dist/styles.css`
- `dist/app.js`

Serve over HTTP (not `file://`):

```bash
python -m http.server 4173
```

Then open: `http://127.0.0.1:4173/dist/`

For GitHub Pages project hosting (`/tic-tac-toe/`), the browser integration test serves and validates that path explicitly.

## Testing

Native engine tests:

```bash
make test-native
```

WebAssembly/browser integration tests:

```bash
npx playwright install chromium
make build
npm test
```

Integration tests verify:

- WASM app loads under `/tic-tac-toe/`
- X win flow
- draw flow
- occupied-cell rejection
- score updates
- `restart round` and `new match` behavior
- console/page/network error detection

## GitHub Actions and Pages

Workflow: `.github/workflows/deploy.yml`

- Runs on push and manual dispatch.
- Runs native tests, builds WASM output, runs browser tests.
- Deploys only from default branch pushes or manual dispatch.
- Uses official Pages actions:
  - `actions/configure-pages`
  - `actions/upload-pages-artifact`
  - `actions/deploy-pages`

Repository Pages setting should be:

- **Settings → Pages → Build and deployment → Source: GitHub Actions**

Expected Pages URL (when enabled and deployed):

- <https://rajibhasenraju.github.io/tic-tac-toe/>

## Troubleshooting

- If `emcc` is missing: install/activate emsdk and retry.
- If browser tests fail due to missing browser binaries: run `npx playwright install chromium`.
- If opening via `file://` fails, use an HTTP server.
- Match scores are in-memory runtime state and do not persist across page reloads.
