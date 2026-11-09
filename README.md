# Tic-Tac-Toe — C and WebAssembly

Local two-player or perfect-play computer mode, a minimal SVG board, and dark/light/system themes.

## Architecture

C11 owns all rules, board/turn/result state, scores, mode, side selection, and minimax computer decisions. JavaScript only loads WASM, forwards input, renders C getters, and schedules a cancellable presentation delay. Computer search uses a private board.

- Engine/API: `src/game.c`, `src/game.h`.
- Interface: `public/`.
- Documentation source: `public/docs/index.html` (search, sidebar, mobile menu).
- Artifact: `dist/`, including `game.js`, `game.wasm`, and `docs/index.html`.

## Build and test

Install C11, Make, Node.js, Python 3, and Emscripten SDK 3.1.57. Activate the SDK and source `emsdk_env.sh`, then run:

```sh
npm ci
npx playwright install --with-deps chromium
make test-native
make build
npm test
python3 scripts/count_states.py
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080/ and `/docs/`. Use HTTP, not file://. The docs contain SDK installation commands, the C API, strategy, history, variants, counting conventions, theme behavior, and troubleshooting.

## Deployment

Choose GitHub Actions in Settings → Pages. CI retains Ubuntu 24.04 and deploys only the default branch. Game target: https://trywith.me/tic-tac-toe/ ; docs target: https://trywith.me/tic-tac-toe/docs/ . A feature-branch build does not publish updates or verify these live URLs.

X starts. Restart keeps scores; New Match clears them. Mode/side changes clear the match. Scores are in memory; theme persistence is best-effort. Native tests explore all human responses against the deterministic computer. Browser tests load real WASM under the repository subpath and exercise both modes, resets, themes, keyboard input, docs and mobile navigation. Check CI before merging; syntax checks alone do not verify browser behavior.
