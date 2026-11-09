(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const assetBase = new URL('.', document.currentScript.src);
  const theme = $('theme');
  const media = matchMedia('(prefers-color-scheme: dark)');
  const stored = () => { try { return localStorage.getItem('ttt-theme') || 'system'; } catch { return 'system'; } };
  theme.value = ['dark', 'light', 'system'].includes(stored()) ? stored() : 'system';
  function applyTheme() { document.documentElement.dataset.theme = theme.value === 'system' ? (media.matches ? 'dark' : 'light') : theme.value; }
  theme.addEventListener('change', () => { try { localStorage.setItem('ttt-theme', theme.value); } catch {} applyTheme(); });
  media.addEventListener('change', applyTheme);
  applyTheme();
  let game = null, timer = null, generation = 0;
  const cells = [];
  const mark = (value) => value === 1 ? 'X' : 'O';
  const symbols = {
    1: '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M14 14L86 86M86 14L14 86" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round"/></svg><span class="sr-only">X</span>',
    2: '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="37" fill="none" stroke="currentColor" stroke-width="12"/></svg><span class="sr-only">O</span>'
  };
  function cancelPending() { ++generation; clearTimeout(timer); timer = null; }
  function render(invalid = false) {
    const result = game._game_get_result();
    const computerTurn = !!game._game_is_computer_turn();
    cells.forEach((cell, i) => {
      const value = game._game_get_cell(i);
      if (cell.dataset.value !== String(value)) { cell.innerHTML = symbols[value] || ''; cell.dataset.value = String(value); }
      cell.classList.toggle('x', value === 1);
      cell.classList.toggle('o', value === 2);
      cell.classList.toggle('winner', game._game_get_winning_cell(i) === 1);
      cell.disabled = computerTurn || !!result;
      cell.setAttribute('aria-label', `Cell ${i + 1} ${value ? mark(value) : 'empty'}`);
    });
    const player = mark(game._game_get_current_player());
    $('status').textContent = result === 3 ? 'Round ended in a draw.' : result ? `Player ${mark(result)} wins this round!` : computerTurn ? `Computer (${player}) is thinking…` : invalid ? `Invalid move. Player ${player}'s turn.` : `Player ${player}'s turn.`;
    $('score-x').textContent = game._game_get_score_x();
    $('score-o').textContent = game._game_get_score_o();
    $('score-draws').textContent = game._game_get_score_draws();
    const computerMode = game._game_get_mode() === 1;
    const human = game._game_get_human_player();
    $('side-label').hidden = !computerMode;
    $('label-x').textContent = computerMode ? human === 1 ? 'You · X' : 'Computer · X' : 'Player X';
    $('label-o').textContent = computerMode ? human === 2 ? 'You · O' : 'Computer · O' : 'Player O';
  }
  function scheduleComputer() {
    if (!game._game_is_computer_turn() || timer !== null) return;
    const token = generation;
    timer = setTimeout(() => {
      timer = null;
      if (token !== generation) return;
      game._game_computer_move();
      render();
    }, 260);
  }
  for (let i = 0; i < 9; ++i) {
    const cell = document.createElement('button');
    cell.type = 'button'; cell.className = 'cell'; cell.dataset.index = i;
    cell.disabled = true; cell.setAttribute('aria-label', `Cell ${i + 1} empty`);
    cell.addEventListener('click', () => {
      if (!game) return;
      const moved = game._game_make_move(i);
      render(!moved); scheduleComputer();
    });
    $('board').append(cell); cells.push(cell);
  }
  function configure() {
    if (!game) return;
    cancelPending();
    game._game_configure(Number($('mode').value), Number($('side').value));
    render(); scheduleComputer();
  }
  $('mode').addEventListener('change', configure);
  $('side').addEventListener('change', configure);
  $('restart-round').addEventListener('click', () => { if (!game) return; cancelPending(); game._game_restart_round(); render(); scheduleComputer(); });
  $('new-match').addEventListener('click', () => { if (!game) return; cancelPending(); game._game_new_match(); render(); scheduleComputer(); });
  (async () => {
    const module = await createGameModule({ locateFile: (path) => new URL(path, assetBase).href });
    game = module; game._game_init();
    $('settings').disabled = false;
    $('restart-round').disabled = false; $('new-match').disabled = false;
    configure();
  })().catch((error) => {
    cancelPending(); game = null;
    $('settings').disabled = true;
    $('restart-round').disabled = true; $('new-match').disabled = true;
    cells.forEach((cell) => { cell.disabled = true; });
    $('status').textContent = 'Failed to load game engine. Please reload the page.';
    console.error(error);
  });
})();
