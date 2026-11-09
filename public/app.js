(() => {
  const RESULT = { ongoing: 0, xWin: 1, oWin: 2, draw: 3 };
  const PLAYER = { x: 1, o: 2 };

  const statusEl = document.getElementById('status');
  const boardEl = document.getElementById('board');
  const scoreXEl = document.getElementById('score-x');
  const scoreOEl = document.getElementById('score-o');
  const scoreDrawsEl = document.getElementById('score-draws');
  const restartBtn = document.getElementById('restart-round');
  const newMatchBtn = document.getElementById('new-match');

  const cells = [];
  let game = null;
  let ready = false;

  function setInteractive(enabled) {
    restartBtn.disabled = !enabled;
    newMatchBtn.disabled = !enabled;
    cells.forEach((cell) => {
      if (!enabled) {
        cell.disabled = true;
      }
    });
  }

  function playerLabel(player) {
    return player === PLAYER.x ? 'X' : 'O';
  }

  function readStatusText(invalidMove = false) {
    const result = game.getResult();
    if (invalidMove) {
      return `Invalid move. Player ${playerLabel(game.getCurrentPlayer())}'s turn.`;
    }
    if (result === RESULT.xWin) {
      return 'Player X wins this round!';
    }
    if (result === RESULT.oWin) {
      return 'Player O wins this round!';
    }
    if (result === RESULT.draw) {
      return "Round ended in a draw.";
    }
    return `Player ${playerLabel(game.getCurrentPlayer())}'s turn.`;
  }

  function render(invalidMove = false) {
    const result = game.getResult();

    for (let i = 0; i < cells.length; i++) {
      const value = game.getCell(i);
      const isWinner = game.getWinningCell(i) === 1;
      cells[i].textContent = value === PLAYER.x ? 'X' : value === PLAYER.o ? 'O' : '';
      cells[i].classList.toggle('x', value === PLAYER.x);
      cells[i].classList.toggle('o', value === PLAYER.o);
      cells[i].classList.toggle('winner', isWinner);
      cells[i].disabled = !ready || result !== RESULT.ongoing;
      cells[i].setAttribute('aria-label', `Cell ${i + 1} ${cells[i].textContent || 'empty'}`);
    }

    statusEl.textContent = readStatusText(invalidMove);
    scoreXEl.textContent = String(game.getScoreX());
    scoreOEl.textContent = String(game.getScoreO());
    scoreDrawsEl.textContent = String(game.getScoreDraws());
  }

  function onCellClick(index) {
    if (!ready) {
      return;
    }
    const moved = game.makeMove(index) === 1;
    render(!moved);
  }

  function createBoard() {
    for (let i = 0; i < 9; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cell';
      button.dataset.index = String(i);
      button.setAttribute('role', 'gridcell');
      button.disabled = true;
      button.addEventListener('click', () => onCellClick(i));
      boardEl.appendChild(button);
      cells.push(button);
    }
  }

  function bindControls() {
    restartBtn.addEventListener('click', () => {
      if (!ready) {
        return;
      }
      game.restartRound();
      render();
    });

    newMatchBtn.addEventListener('click', () => {
      if (!ready) {
        return;
      }
      game.newMatch();
      render();
    });
  }

  function createGameApi(module) {
    return {
      init: () => module._game_init(),
      isValidMove: (index) => module._game_is_valid_move(index),
      makeMove: (index) => module._game_make_move(index),
      getCell: (index) => module._game_get_cell(index),
      getCurrentPlayer: () => module._game_get_current_player(),
      getResult: () => module._game_get_result(),
      getScoreX: () => module._game_get_score_x(),
      getScoreO: () => module._game_get_score_o(),
      getScoreDraws: () => module._game_get_score_draws(),
      getWinningCell: (index) => module._game_get_winning_cell(index),
      restartRound: () => module._game_restart_round(),
      newMatch: () => module._game_new_match()
    };
  }

  async function initWasm() {
    const scriptUrl = new URL(document.currentScript?.src || window.location.href, window.location.href);
    const assetBase = new URL('.', scriptUrl);
    const module = await createGameModule({
      locateFile(path) {
        return new URL(path, assetBase).toString();
      }
    });

    game = createGameApi(module);
    game.init();
    ready = true;
    setInteractive(true);
    render();
  }

  createBoard();
  bindControls();
  setInteractive(false);

  initWasm().catch((error) => {
    ready = false;
    statusEl.textContent = 'Failed to load game engine. Please reload the page.';
    console.error(error);
  });
})();
