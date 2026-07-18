(function () {
  var SIZE = 4;
  var BEST_SCORE_KEY = 'game2048-best-score';
  var SWIPE_THRESHOLD = 24;

  var board = [];
  var score = 0;
  var bestScore = 0;
  var isOver = false;
  var hasWon = false;
  var keepPlayingAfterWin = false;

  var boardGridEl = document.getElementById('board-grid');
  var tileLayerEl = document.getElementById('tile-layer');
  var scoreCurrentEl = document.getElementById('score-current');
  var scoreBestEl = document.getElementById('score-best');
  var overlayEl = document.getElementById('game-overlay');
  var overlayTextEl = document.getElementById('game-overlay-text');
  var overlayKeepPlayingBtn = document.getElementById('overlay-keep-playing-btn');
  var overlayRetryBtn = document.getElementById('overlay-retry-btn');
  var newGameBtn = document.getElementById('new-game-btn');
  var boardWrapperEl = document.querySelector('.board-wrapper');

  function createEmptyBoard() {
    var b = [];
    for (var r = 0; r < SIZE; r++) {
      b.push([0, 0, 0, 0]);
    }
    return b;
  }

  function transpose(b) {
    var t = createEmptyBoard();
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        t[c][r] = b[r][c];
      }
    }
    return t;
  }

  function reverseRows(b) {
    return b.map(function (row) {
      return row.slice().reverse();
    });
  }

  function moveRowLeft(row) {
    var values = row.filter(function (v) {
      return v !== 0;
    });
    var merged = [];
    var mergedIndices = [];
    var gained = 0;

    for (var i = 0; i < values.length; i++) {
      if (i < values.length - 1 && values[i] === values[i + 1]) {
        var mergedValue = values[i] * 2;
        merged.push(mergedValue);
        mergedIndices.push(merged.length - 1);
        gained += mergedValue;
        i++; // 방금 합친 칸은 다시 병합 대상이 되지 않도록 한 칸 더 건너뜀
      } else {
        merged.push(values[i]);
      }
    }

    while (merged.length < SIZE) {
      merged.push(0);
    }

    var moved = merged.some(function (v, idx) {
      return v !== row[idx];
    });

    return { row: merged, gained: gained, moved: moved, mergedIndices: mergedIndices };
  }

  function reverseRowsCoord(cells) {
    return cells.map(function (cell) {
      return { row: cell.row, col: SIZE - 1 - cell.col };
    });
  }

  function transposeCoord(cells) {
    return cells.map(function (cell) {
      return { row: cell.col, col: cell.row };
    });
  }

  function moveLeft(b) {
    var moved = false;
    var gained = 0;
    var mergedCells = [];
    var result = b.map(function (row, r) {
      var res = moveRowLeft(row);
      if (res.moved) moved = true;
      gained += res.gained;
      res.mergedIndices.forEach(function (idx) {
        mergedCells.push({ row: r, col: idx });
      });
      return res.row;
    });
    return { board: result, moved: moved, gained: gained, mergedCells: mergedCells };
  }

  function moveRight(b) {
    var reversed = reverseRows(b);
    var result = moveLeft(reversed);
    return {
      board: reverseRows(result.board),
      moved: result.moved,
      gained: result.gained,
      mergedCells: reverseRowsCoord(result.mergedCells)
    };
  }

  function moveUp(b) {
    var t = transpose(b);
    var result = moveLeft(t);
    return {
      board: transpose(result.board),
      moved: result.moved,
      gained: result.gained,
      mergedCells: transposeCoord(result.mergedCells)
    };
  }

  function moveDown(b) {
    var t = transpose(b);
    var result = moveRight(t);
    return {
      board: transpose(result.board),
      moved: result.moved,
      gained: result.gained,
      mergedCells: transposeCoord(result.mergedCells)
    };
  }

  function move(direction) {
    if (direction === 'left') return moveLeft(board);
    if (direction === 'right') return moveRight(board);
    if (direction === 'up') return moveUp(board);
    if (direction === 'down') return moveDown(board);
    return { board: board, moved: false, gained: 0 };
  }

  function emptyCells(b) {
    var cells = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (b[r][c] === 0) cells.push({ row: r, col: c });
      }
    }
    return cells;
  }

  function spawnRandomTile() {
    var cells = emptyCells(board);
    if (cells.length === 0) return null;
    var cell = cells[Math.floor(Math.random() * cells.length)];
    board[cell.row][cell.col] = Math.random() < 0.9 ? 2 : 4;
    return cell;
  }

  function hasAvailableMoves() {
    if (emptyCells(board).length > 0) return true;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = board[r][c];
        if (c < SIZE - 1 && board[r][c + 1] === v) return true;
        if (r < SIZE - 1 && board[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  function checkGameOver() {
    if (!hasAvailableMoves()) {
      isOver = true;
    }
  }

  function checkWin() {
    if (hasWon) return;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] >= 2048) {
          hasWon = true;
          return;
        }
      }
    }
  }

  function buildBoardGrid() {
    boardGridEl.innerHTML = '';
    for (var i = 0; i < SIZE * SIZE; i++) {
      var cell = document.createElement('div');
      cell.className = 'board-cell';
      boardGridEl.appendChild(cell);
    }
  }

  function tileClassForValue(value) {
    if (value <= 2048) return 'tile-' + value;
    return 'tile-super';
  }

  function render(options) {
    var opts = options || {};
    var mergedCells = opts.mergedCells || [];
    var newCell = opts.newCell || null;

    tileLayerEl.innerHTML = '';
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var value = board[r][c];
        if (value === 0) continue;

        var tile = document.createElement('div');
        tile.className = 'tile ' + tileClassForValue(value);
        tile.textContent = value;
        tile.style.top = (r * 25) + '%';
        tile.style.left = (c * 25) + '%';

        if (newCell && newCell.row === r && newCell.col === c) {
          tile.classList.add('tile-new');
        }
        if (mergedCells.some(function (m) { return m.row === r && m.col === c; })) {
          tile.classList.add('tile-merged');
        }

        tileLayerEl.appendChild(tile);
      }
    }

    scoreCurrentEl.textContent = String(score);
    scoreBestEl.textContent = String(bestScore);
  }

  function showOverlay(text, showKeepPlaying) {
    overlayTextEl.textContent = text;
    overlayKeepPlayingBtn.hidden = !showKeepPlaying;
    overlayEl.hidden = false;
  }

  function hideOverlay() {
    overlayEl.hidden = true;
  }

  function updateBestScore() {
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    }
  }

  function handleMove(direction) {
    if (isOver) return;
    if (hasWon && !keepPlayingAfterWin) return;

    var result = move(direction);
    if (!result.moved) return;

    board = result.board;
    score += result.gained;
    updateBestScore();

    var newCell = spawnRandomTile();

    var wasWonBefore = hasWon;
    checkWin();
    checkGameOver();

    render({ mergedCells: result.mergedCells, newCell: newCell });

    if (hasWon && !wasWonBefore) {
      showOverlay('2048 달성! 승리했습니다.', true);
      return;
    }
    if (isOver) {
      showOverlay('게임 오버', false);
    }
  }

  function newGame() {
    board = createEmptyBoard();
    score = 0;
    isOver = false;
    hasWon = false;
    keepPlayingAfterWin = false;
    hideOverlay();
    spawnRandomTile();
    spawnRandomTile();
    render();
  }

  var KEY_DIRECTIONS = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right'
  };

  document.addEventListener('keydown', function (event) {
    var direction = KEY_DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    handleMove(direction);
  });

  var touchStartX = 0;
  var touchStartY = 0;

  boardWrapperEl.addEventListener('touchstart', function (event) {
    var touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  });

  boardWrapperEl.addEventListener('touchend', function (event) {
    var touch = event.changedTouches[0];
    var deltaX = touch.clientX - touchStartX;
    var deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD) return;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      handleMove(deltaX > 0 ? 'right' : 'left');
    } else {
      handleMove(deltaY > 0 ? 'down' : 'up');
    }
  });

  newGameBtn.addEventListener('click', newGame);
  overlayRetryBtn.addEventListener('click', newGame);
  overlayKeepPlayingBtn.addEventListener('click', function () {
    keepPlayingAfterWin = true;
    hideOverlay();
  });

  bestScore = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
  buildBoardGrid();
  newGame();
})();
