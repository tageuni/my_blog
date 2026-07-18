(function () {
  var GRID_SIZE = 16;
  var CELL_SIZE = 24; // canvas.width(384) / GRID_SIZE — 캔버스 intrinsic 해상도 계산 근거

  var PALETTE_COLORS = [
    '#000000', '#ffffff', '#9d9d9d', '#4a4a4a',
    '#e63946', '#f4845f', '#f9c74f', '#90be6d',
    '#43aa8b', '#277da1', '#4361ee', '#7209b7',
    '#f72585', '#b5651d', '#ffd1dc', '#264653'
  ];

  var pixels = [];
  var currentColor = PALETTE_COLORS[0];
  var isErasing = false;
  var isDrawing = false;
  var lastPaintedCell = null;

  var canvasEl = document.getElementById('pixel-canvas');
  var ctx = canvasEl.getContext('2d');
  var paletteEl = document.getElementById('palette');
  var customColorEl = document.getElementById('custom-color');
  var eraserBtn = document.getElementById('eraser-btn');
  var clearBtn = document.getElementById('clear-btn');
  var saveBtn = document.getElementById('save-btn');

  function createEmptyPixels() {
    var p = [];
    for (var r = 0; r < GRID_SIZE; r++) {
      p.push(new Array(GRID_SIZE).fill(null));
    }
    return p;
  }

  function clientToCell(clientX, clientY) {
    var rect = canvasEl.getBoundingClientRect();
    var x = (clientX - rect.left) / rect.width * GRID_SIZE;
    var y = (clientY - rect.top) / rect.height * GRID_SIZE;
    var col = Math.floor(x);
    var row = Math.floor(y);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row: row, col: col };
  }

  function drawCell(row, col, value) {
    var x = col * CELL_SIZE;
    var y = row * CELL_SIZE;
    ctx.clearRect(x, y, CELL_SIZE, CELL_SIZE);
    if (value) {
      ctx.fillStyle = value;
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    }
  }

  function renderAll() {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        if (pixels[r][c]) drawCell(r, c, pixels[r][c]);
      }
    }
  }

  function paintCell(row, col) {
    if (lastPaintedCell && lastPaintedCell.row === row && lastPaintedCell.col === col) return;
    var value = isErasing ? null : currentColor;
    pixels[row][col] = value;
    drawCell(row, col, value);
    lastPaintedCell = { row: row, col: col };
  }

  function handlePointerDown(clientX, clientY) {
    isDrawing = true;
    lastPaintedCell = null;
    var cell = clientToCell(clientX, clientY);
    if (cell) paintCell(cell.row, cell.col);
  }

  function handlePointerMove(clientX, clientY) {
    if (!isDrawing) return;
    var cell = clientToCell(clientX, clientY);
    if (cell) paintCell(cell.row, cell.col);
  }

  function handlePointerUp() {
    isDrawing = false;
    lastPaintedCell = null;
  }

  function setActiveSwatch(swatchEl) {
    var swatches = paletteEl.querySelectorAll('.swatch');
    for (var i = 0; i < swatches.length; i++) {
      swatches[i].classList.remove('is-active');
    }
    if (swatchEl) swatchEl.classList.add('is-active');
  }

  function selectColor(color, swatchEl) {
    currentColor = color;
    isErasing = false;
    eraserBtn.classList.remove('is-active');
    setActiveSwatch(swatchEl);
  }

  function buildPalette() {
    PALETTE_COLORS.forEach(function (color, index) {
      var swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'swatch';
      swatch.style.background = color;
      swatch.setAttribute('aria-label', color);
      if (index === 0) swatch.classList.add('is-active');
      swatch.addEventListener('click', function () {
        selectColor(color, swatch);
      });
      paletteEl.appendChild(swatch);
    });
  }

  function toggleEraser() {
    isErasing = !isErasing;
    eraserBtn.classList.toggle('is-active', isErasing);
    if (isErasing) setActiveSwatch(null);
  }

  function clearAll() {
    if (!window.confirm('전체 지우시겠습니까?')) return;
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        pixels[r][c] = null;
      }
    }
    renderAll();
  }

  function saveAsPng() {
    canvasEl.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'pixel-art.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  canvasEl.addEventListener('mousedown', function (event) {
    handlePointerDown(event.clientX, event.clientY);
  });
  canvasEl.addEventListener('mousemove', function (event) {
    handlePointerMove(event.clientX, event.clientY);
  });
  window.addEventListener('mouseup', handlePointerUp);

  canvasEl.addEventListener('touchstart', function (event) {
    event.preventDefault();
    var touch = event.touches[0];
    handlePointerDown(touch.clientX, touch.clientY);
  });
  canvasEl.addEventListener('touchmove', function (event) {
    event.preventDefault();
    var touch = event.touches[0];
    handlePointerMove(touch.clientX, touch.clientY);
  });
  canvasEl.addEventListener('touchend', function (event) {
    event.preventDefault();
    handlePointerUp();
  });

  customColorEl.addEventListener('input', function () {
    selectColor(customColorEl.value, null);
  });
  eraserBtn.addEventListener('click', toggleEraser);
  clearBtn.addEventListener('click', clearAll);
  saveBtn.addEventListener('click', saveAsPng);

  pixels = createEmptyPixels();
  ctx.imageSmoothingEnabled = false;
  buildPalette();
  renderAll();
})();
