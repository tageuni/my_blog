# 픽셀 아트 에디터 추가 구현 계획서

## 1. 개요

16x16 격자에 마우스(클릭/드래그) 또는 터치로 도트를 찍어 그림을 그리고, 완성한 그림을 PNG 파일로 다운로드할 수 있는 도구다.

- 격자: 16x16 고정 크기. 칸마다 색을 채우거나(그리기) 비울(지우기) 수 있다.
- 그리기: 마우스 클릭 또는 마우스를 누른 채 드래그하면 지나가는 칸에 연속으로 같은 색이 칠해진다. 터치 기기에서도 손가락으로 누른 채 이동하면 동일하게 동작한다.
- 색상 팔레트: 미리 정의된 색상 스와치 중 하나를 클릭해 현재 그리기 색을 고른다. 팔레트에 없는 색은 `<input type="color">`로 직접 고를 수 있다. 지우개 도구로 칠한 칸을 다시 투명하게 되돌릴 수 있다.
- 저장: "PNG로 저장" 버튼을 누르면 현재 그림을 확대된 해상도의 PNG 파일로 다운로드한다. 칠하지 않은 칸은 투명(알파 0)으로 저장된다.
- 전체 지우기: 격자를 전부 초기 상태(빈 칸)로 되돌리는 버튼을 둔다.

이 프로젝트는 마크다운 글을 정적 HTML로 변환하는 블로그이며, 픽셀 아트 에디터는 글(마크다운)이 아니므로 `posts/` → 빌드 파이프라인(frontmatter 파싱, 마크다운 파싱, 템플릿 렌더링)을 전혀 타지 않는다. 이미 같은 방식으로 통합되어 있는 2048 게임(`src/games/2048/`)과 동일하게, 손으로 작성한 순수 HTML/CSS/JS 정적 자산을 빌드 시점에 `dist/`로 그대로 복사하는 방식으로 통합한다.

## 2. 파일 구조 및 디렉터리 위치 결정

```
src/
  tools/
    pixel-art/
      index.html   # 에디터 페이지 마크업 (직접 작성한 완성된 HTML, 템플릿 엔진 미사용)
      style.css    # 에디터 전용 스타일 (캔버스/팔레트/버튼/반응형/다크모드 오버라이드)
      editor.js    # 에디터 로직 (격자 상태 관리, 드로잉 입력 처리, 팔레트, PNG 내보내기)
build/
  config.js        # 수정: nav 배열에 픽셀 아트 링크 항목 추가
  build.js         # 수정: copyStaticAssets()를 일반화해 src/tools도 복사 대상에 포함
```

### 2.1 왜 `src/games/pixel-art/`가 아니라 `src/tools/pixel-art/`인가

픽셀 아트 에디터는 승패나 점수가 없는 **제작 도구**이지 게임이 아니다. `src/games/`에 억지로 끼워 넣으면 디렉터리 이름이 내용을 정확히 설명하지 못하고, 앞으로 게임이 아닌 도구(예: 색상 팔레트 생성기, 마크다운 미리보기 등)가 더 추가될 때마다 같은 문제가 반복된다. 따라서 `src/games`와 대등한 위치에 `src/tools`라는 새 최상위 디렉터리를 두고, 그 아래 `pixel-art/`를 배치한다. URL 경로도 `/tools/pixel-art/`가 되어 `/games/2048/`과 마찬가지로 "카테고리/항목" 트레일링 슬래시 규칙을 그대로 따른다.

### 2.2 빌드 복사 로직 일반화 (`build/build.js`)

2048을 추가할 때 `copyStaticAssets()`에 `gamesSrc` 복사 블록 하나를 그대로 복붙해 추가했는데, 이번에 `toolsSrc`까지 추가하면 같은 코드가 세 번 반복된다. 디렉터리가 하나 더 늘어날 때마다 함수 본문을 계속 늘리는 대신, "복사할 정적 자산 디렉터리 이름 목록"을 배열로 선언하고 반복문으로 처리하도록 일반화한다.

```js
const STATIC_ASSET_DIRS = ['styles', 'scripts', 'games', 'tools'];

function copyStaticAssets() {
  for (const dirName of STATIC_ASSET_DIRS) {
    const src = path.join(SRC_DIR, dirName);
    if (fs.existsSync(src)) {
      fs.cpSync(src, path.join(DIST_DIR, dirName), { recursive: true });
    }
  }
}
```

- 동작은 기존과 동일하다(`src/styles → dist/styles`, `src/scripts → dist/scripts`, `src/games → dist/games`를 그대로 복사). 여기에 `src/tools → dist/tools` 한 줄만큼의 효과가 추가된다.
- 이후 `src/` 아래 새로운 정적 자산 카테고리(예: 나중에 `src/widgets` 등)가 생기면 `STATIC_ASSET_DIRS` 배열에 문자열 하나만 추가하면 되고, `copyStaticAssets()` 함수 본문은 더 이상 건드릴 필요가 없다.
- `build()` 함수 본문, `readPosts()`, `writeFile()` 등 다른 로직은 변경하지 않는다. 픽셀 아트 에디터는 `posts` 목록에 들어가지 않고 검색 인덱스(`search-index.json`)에도 포함되지 않는다 (마크다운 글이 아니므로 검색 대상에서 의도적으로 제외 — 2048과 동일한 취급).

## 3. HTML 구조 설계 (`src/tools/pixel-art/index.html`)

2048(`src/games/2048/index.html`)과 동일한 패턴을 그대로 따른다: `templates.js`의 `layout()`을 재사용하지 않고, 동일한 공통 클래스(`site-header`, `site-nav`, `nav-link`, `theme-toggle` 등)와 CSS 변수만 맞춰 손으로 완성된 정적 HTML을 작성한다. 경로 깊이가 2048과 같으므로(`dist/tools/pixel-art/index.html`) 상대 경로도 동일하게 `../../`를 사용한다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>픽셀 아트 에디터 - My Blog</title>
<meta name="description" content="16x16 격자에 도트를 찍어 그림을 그리고 PNG로 저장하는 픽셀 아트 에디터">
<link rel="stylesheet" href="../../styles/main.css">
<link rel="stylesheet" href="style.css">
<script>
(function () {
  var saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved);
  }
})();
</script>
</head>
<body>
<header class="site-header">
  <div class="site-header-inner">
    <a class="site-title" href="../../">My Blog</a>
    <nav class="site-nav">
      <a class="nav-link" href="../../">홈</a>
      <a class="nav-link" href="../../tags/">태그</a>
      <a class="nav-link" href="../../games/2048/">2048</a>
      <a class="nav-link is-active" href="../../tools/pixel-art/">픽셀 아트</a>
    </nav>
    <div class="site-header-actions">
      <button id="theme-toggle" class="theme-toggle" type="button" aria-label="다크 모드 전환">🌓</button>
    </div>
  </div>
</header>
<main class="site-main pixel-art-main">
  <section class="pixel-art">
    <div class="pixel-art-header">
      <h1>픽셀 아트 에디터</h1>
      <p class="pixel-art-help">클릭 또는 드래그로 칠하세요. 16x16 격자, PNG로 저장할 수 있습니다.</p>
    </div>
    <div class="pixel-art-toolbar">
      <div id="palette" class="palette"></div>
      <label class="custom-color-label">
        커스텀
        <input type="color" id="custom-color" value="#000000">
      </label>
      <button id="eraser-btn" class="tool-btn" type="button">지우개</button>
      <button id="clear-btn" class="tool-btn" type="button">전체 지우기</button>
      <button id="save-btn" class="tool-btn tool-btn-primary" type="button">PNG로 저장</button>
    </div>
    <div class="canvas-wrapper">
      <canvas id="pixel-canvas" width="384" height="384" aria-label="16x16 픽셀 아트 캔버스"></canvas>
    </div>
  </section>
</main>
<footer class="site-footer">
  <p>&copy; 2026 My Blog</p>
</footer>
<script src="../../scripts/theme-toggle.js"></script>
<script src="editor.js"></script>
</body>
</html>
```

포인트:
- `main.css`는 상대 경로(`../../styles/main.css`)로 불러와 `:root` 공통 변수와 헤더/버튼 스타일을 재사용한다. 2048과 마찬가지로 모든 링크·자산 경로를 상대 경로로 작성해 `config.js`의 `basePath`(GitHub Pages 서브패스 배포용)와 무관하게 항상 올바르게 동작하도록 한다.
- nav에 기존 "2048" 링크도 함께 하드코딩한다. 손으로 쓴 정적 페이지가 두 개(2048, 픽셀 아트)로 늘었으므로, 서로의 nav에 서로를 나열해 두 정적 페이지 사이도 자유롭게 이동할 수 있게 한다 (`build/config.js`의 `nav` 배열과 내용이 일치해야 함 — 7절 참고).
- `theme-toggle.js`만 재사용하고, `tag-filter.js`/`search.js`는 이 페이지에 해당 요소가 없으므로 로드하지 않는다 (2048과 동일).
- `<canvas id="pixel-canvas" width="384" height="384">`처럼 캔버스의 **실제(intrinsic) 픽셀 크기**를 HTML 속성으로 명시한다. `384 = 16 * 24`(칸당 24px)로, CSS로 화면에 보이는 크기를 줄이더라도(반응형) 캔버스 내부 해상도는 항상 384x384로 고정되어 좌표 계산과 PNG 저장 해상도가 예측 가능해진다 (4.2, 4.5절 참고).

## 4. JS 로직 설계 (`src/tools/pixel-art/editor.js`)

`src/scripts/*.js`, `src/games/2048/game.js`와 동일한 컨벤션을 따른다: 전체를 IIFE로 감싸고 `var`와 `function () {}` 표현식을 사용하며, 주석은 자명하지 않은 이유가 있을 때만 남긴다.

```js
(function () {
  var GRID_SIZE = 16;
  var CELL_SIZE = 24; // canvas.width(384) / GRID_SIZE — 캔버스 intrinsic 해상도 계산 근거
  ...
})();
```

### 4.1 캔버스 vs div 격자 — Canvas를 선택한 근거

`<div>` 256개(16x16)를 그리드로 배치하는 방식도 가능하지만, 이 기능의 핵심 요구사항인 **PNG 저장**을 고려하면 Canvas API가 훨씬 자연스럽다.

- `canvas.toBlob(callback, 'image/png')` / `canvas.toDataURL('image/png')`로 화면에 그린 내용을 곧바로 PNG로 추출할 수 있다. div 격자를 쓰면 DOM을 순회하며 각 칸의 배경색을 읽어 별도로 픽셀 버퍼를 구성하고 그것으로 다시 canvas를 그려 내보내야 하므로 이중 작업이 된다.
- 픽셀 아트는 본질적으로 "정사각형 그리드의 래스터 이미지"이므로 canvas의 픽셀 기반 모델과 정확히 대응된다. 상태 배열(2차원 색상 배열) → `fillRect` 렌더링 → 그대로 내보내기가 한 가지 표현으로 통일된다.
- div 격자 256개는 DOM 노드가 많아 무겁지는 않지만, 매 드래그 프레임마다 여러 노드의 `style.background`를 갱신하는 것보다 canvas에 사각형을 그리는 것이 더 간단하고 성능도 가볍다.

### 4.2 상태 관리

- `pixels`: `GRID_SIZE x GRID_SIZE` 2차원 배열(`var pixels`). 각 칸의 값은 색상 문자열(예: `'#e63946'`) 또는 칠하지 않은 칸을 뜻하는 `null`. 2048의 `board` 배열과 동일한 패턴(모듈 스코프 변수 + 2차원 배열)이다.
- `currentColor`: 현재 선택된 그리기 색(문자열). 팔레트 스와치를 클릭하거나 커스텀 색상 입력을 바꾸면 갱신된다.
- `isErasing`: 지우개 모드 여부(불리언). 켜져 있으면 그리기 동작이 `pixels[row][col] = null`로 칠한다.
- `isDrawing`: 마우스/터치가 눌려 있는 동안 `true`. `mousedown`/`touchstart`에서 켜지고 `mouseup`/`touchend`/`mouseleave`(및 `window`의 `mouseup`, 포인터가 캔버스 밖에서 떼어지는 경우 대비)에서 꺼진다.
- `lastPaintedCell`: 드래그 중 마지막으로 칠한 `{row, col}`. 같은 칸에 대해 매 `mousemove`마다 중복으로 `fillRect`를 다시 그리지 않도록 변경된 칸만 다시 그린다.
- 렌더링은 2048과 마찬가지로 상태 → 캔버스로 가는 단방향 흐름이되, 매번 캔버스 전체를 지우고 다시 그리는 대신 **바뀐 칸 하나만 다시 그리는** 부분 렌더링을 기본으로 한다(4.4절). "전체 지우기"처럼 상태 전체가 바뀔 때만 전체 재렌더링 함수(`renderAll()`)를 호출한다.

### 4.3 좌표 변환 (포인터 좌표 → 격자 칸)

캔버스의 intrinsic 해상도(384x384)와 화면에 실제로 보이는 CSS 크기가 반응형으로 인해 달라질 수 있으므로(작은 화면에서는 `max-width: 100%`로 축소됨), 클릭/터치 좌표는 `getBoundingClientRect()`로 얻은 화면상의 크기를 기준으로 비율 변환해야 정확히 맞아떨어진다.

```js
function clientToCell(clientX, clientY) {
  var rect = canvasEl.getBoundingClientRect();
  var x = (clientX - rect.left) / rect.width * GRID_SIZE;
  var y = (clientY - rect.top) / rect.height * GRID_SIZE;
  var col = Math.floor(x);
  var row = Math.floor(y);
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
  return { row: row, col: col };
}
```

이렇게 하면 캔버스가 CSS로 몇 배로 축소/확대되어 표시되든(모바일 반응형 포함) 항상 올바른 16x16 칸 좌표를 얻는다.

### 4.4 그리기 입력 처리 (마우스 + 터치)

CLAUDE.md의 모바일 반응형 필수 원칙에 따라 마우스 드래그와 터치 드래그를 모두 지원한다. 두 입력 방식이 결국 같은 동작(칸 하나 칠하기)을 하므로 공통 함수로 묶는다.

```js
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
```

- **마우스**: `canvasEl`에 `mousedown`(→ `handlePointerDown`), `mousemove`(→ `handlePointerMove`)를 달고, `mouseup`은 캔버스 밖에서 뗄 수도 있으므로 `window`에 단다(`handlePointerUp`). 캔버스 밖으로 나가서 눌린 채 다시 들어와도 자연스럽게 이어지도록 `mouseleave`에서는 그리기를 끊지 않는다(2048처럼 손을 뗄 때까지 계속 그릴 수 있어야 자연스러움).
- **터치**: `canvasEl`에 `touchstart`/`touchmove`를 달아 `event.touches[0]`의 `clientX`/`clientY`를 위 함수에 그대로 전달하고, `touchend`에서 `handlePointerUp()`을 호출한다. 각 핸들러에서 `event.preventDefault()`를 호출해 화면 스크롤/핀치줌이 그리기 동작과 충돌하지 않게 한다. CSS에서도 `.canvas-wrapper` 또는 `#pixel-canvas`에 `touch-action: none;`을 지정해(2048의 `.board-wrapper`와 동일한 패턴) 브라우저 기본 제스처를 억제한다.
- 단순 클릭(드래그 없이 한 번 찍기)은 `mousedown`만으로 이미 한 칸이 칠해지므로 별도 처리가 필요 없다.

### 4.5 렌더링

```js
function colorForCell(row, col) {
  return pixels[row][col];
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
```

- 칠하지 않은 칸은 `fillRect`를 호출하지 않고 `clearRect`로 비워 둔다 — 즉 캔버스 자체는 투명 배경을 유지한다. 사용자가 "빈 칸"과 "흰색으로 칠한 칸"을 구분할 수 있도록, 빈 칸은 캔버스 뒤에 비치는 **바둑판(checkerboard) 패턴**으로 표시한다. 이는 캔버스에 직접 그리지 않고 `.canvas-wrapper`의 CSS 배경(`repeating-conic-gradient` 또는 `repeating-linear-gradient` 조합)으로 처리한다 — 캔버스는 투명 그대로 두고 그 뒤에 체크무늬가 비쳐 보이는 방식이라, 실제 저장되는 PNG에는 체크무늬가 섞이지 않고 순수하게 투명 알파만 남는다(4.6절 PNG 저장과 일치).
- `ctx.imageSmoothingEnabled = false`로 캔버스를 초기화해, 확대된 사각형 경계가 안티앨리어싱으로 흐려지지 않고 픽셀 아트 특유의 또렷한 경계를 유지하게 한다.

### 4.6 색상 팔레트

- **미리 정의된 스와치**: 흑/백/회색조 몇 단계 + 기본 색상(빨강, 주황, 노랑, 초록, 파랑, 남색, 보라 등) 약 12~16개를 배열로 선언하고, `#palette` 컨테이너에 버튼(`<button class="swatch">`)으로 렌더링한다. 각 스와치는 `style.background = 색상값`으로 표시하고, 클릭 시 `currentColor`를 그 색으로 설정하며 `isErasing = false`로 되돌린다. 현재 선택된 스와치에는 `is-active` 클래스(2048의 `tag-filter-chip.is-active`, 인덱스 페이지의 태그 필터 칩과 동일한 패턴)로 테두리를 강조한다.
- **커스텀 색상**: `<input type="color" id="custom-color">`를 팔레트 옆에 둔다. `input` 이벤트가 발생하면 `currentColor`를 그 값으로 설정하고 `isErasing = false`로 되돌린다. 브라우저 내장 컬러피커이므로 별도 라이브러리 없이 임의의 색상을 고를 수 있다.
- **지우개**: 별도 도구 버튼(`#eraser-btn`)으로 구현한다. 클릭 시 `isErasing = true`로 설정하고, 팔레트/커스텀 색상 선택 쪽은 `isErasing = false`로 되돌리는 상호 배타적 토글로 만든다. 지우개가 활성화된 동안은 `#eraser-btn`에 `is-active` 클래스를 붙여 현재 도구가 무엇인지 시각적으로 알 수 있게 한다.
- 팔레트가 필요한 이유: 매번 커스텀 색상 피커를 여는 것보다 자주 쓰는 색을 한 번의 클릭으로 고를 수 있어야 실제로 쓸모 있는 도구가 된다는 사용자 요구사항(“색상 팔레트가 있어야 한다”)을 직접 충족한다.

### 4.7 PNG 저장

```js
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
```

- **원본 16x16 그대로가 아니라 확대해서 저장하는 이유**: 16x16 픽셀은 대부분의 이미지 뷰어/OS 썸네일에서 너무 작아 실용성이 떨어진다(아이콘 크기 수준). 반면 캔버스는 이미 3.항에서 결정한 대로 intrinsic 해상도를 384x384(칸당 24px)로 잡아 두었고, 그리기도 이미 그 해상도 기준으로 `fillRect`가 이루어지므로, **별도의 확대 로직 없이 `canvas.toBlob()`을 그대로 호출하는 것만으로 384x384 PNG가 나온다.** 즉 "화면에 보이는 CSS 크기"와 무관하게 캔버스의 실제 픽셀 해상도가 저장 해상도를 결정하므로, 오프스크린 캔버스를 새로 만들어 확대 복사하는 추가 작업이 필요 없다. `ctx.imageSmoothingEnabled = false`(4.5절)를 지정해 두었기 때문에 384x384로 저장되어도 경계가 흐려지지 않고 16x16 칸이 또렷한 정사각형 블록으로 저장된다.
- 칠하지 않은 칸은 캔버스 자체가 투명(alpha 0)이므로 PNG에도 그대로 투명하게 저장된다 — 별도 배경색 합성을 하지 않는다 (사용자가 흰 배경을 원하면 흰색 스와치로 직접 칠하면 된다).
- `toBlob` + `URL.createObjectURL` + 임시 `<a download>` 클릭 조합은 외부 라이브러리 없이 브라우저 표준 API만으로 파일 다운로드를 구현하는 가장 일반적인 방법이며, CLAUDE.md의 "외부 라이브러리 최소화" 원칙과도 맞는다.

### 4.8 전체 지우기

```js
function clearAll() {
  for (var r = 0; r < GRID_SIZE; r++) {
    for (var c = 0; c < GRID_SIZE; c++) {
      pixels[r][c] = null;
    }
  }
  renderAll();
}
```

- `#clear-btn` 클릭 시 호출한다. 되돌릴 수 없는 파괴적 동작이므로 `window.confirm('전체 지우시겠습니까?')`로 한 번 확인을 받은 뒤 실행한다. 2048의 "새 게임" 버튼은 확인 절차가 없지만, 그쪽은 점수가 이미 localStorage에 최고 기록으로 보존되어 손실이 없는 반면, 픽셀 아트는 저장하지 않은 그림이 그대로 사라지므로 확인 절차를 추가하는 것이 타당하다.
- 실행취소(undo) 기능은 이번 요구사항에 없으므로 구현하지 않는다(범위 밖으로 명시).

### 4.9 초기화

- 페이지 로드 시(스크립트 맨 끝에서 즉시 실행): `pixels`를 전부 `null`로 채운 16x16 배열로 초기화, `ctx.imageSmoothingEnabled = false` 설정, 팔레트 스와치 DOM 생성 및 첫 번째 스와치를 기본 `currentColor`로 선택, 각종 이벤트 리스너 등록.
- localStorage를 이용한 자동 저장/복원은 이번 요구사항(PNG 저장)에 없으므로 구현하지 않는다 — 2048의 "최고 점수"처럼 저장할 값이 없고, 그림 자체를 localStorage에 직렬화해 저장하는 것은 범위를 벗어난 별도 기능이라 판단해 제외한다.

## 5. CSS 설계 (`src/tools/pixel-art/style.css`)

`main.css`의 3단 다크모드 구조(`:root` 기본값 → `@media (prefers-color-scheme: dark)` → `:root[data-theme='light']`/`:root[data-theme='dark']`)를 2048의 `style.css`와 동일하게 그대로 따른다. 이 페이지에서 추가로 정의가 필요한 변수는 체크무늬 배경색 두 톤뿐이다.

```css
:root {
  --checker-a: #e2e2e2;
  --checker-b: #f5f5f5;
}

@media (prefers-color-scheme: dark) {
  :root {
    --checker-a: #24272d;
    --checker-b: #1c1f24;
  }
}

:root[data-theme='dark'] {
  --checker-a: #24272d;
  --checker-b: #1c1f24;
}

:root[data-theme='light'] {
  --checker-a: #e2e2e2;
  --checker-b: #f5f5f5;
}
```

- **레이아웃**: `.pixel-art-main { display: flex; justify-content: center; }`, `.pixel-art { width: 100%; max-width: 480px; }`로 2048의 `.game-2048`과 동일한 폭 제약을 둬 본문 사이트 전체와 통일감을 준다.
- **캔버스 반응형**: `#pixel-canvas { width: 100%; max-width: 384px; height: auto; aspect-ratio: 1; display: block; margin: 0 auto; image-rendering: pixelated; touch-action: none; }`. `width`/`height` HTML 속성(384x384)은 intrinsic 해상도를 고정하고, CSS의 `width: 100%; max-width: 384px; height: auto;`가 화면 크기에 맞춰 표시 크기만 반응형으로 줄인다(모바일 우선). `image-rendering: pixelated`는 CSS가 캔버스를 축소/확대해 표시할 때도 칸 경계가 흐려지지 않도록 보장한다(저장되는 PNG 해상도와는 무관하게 화면 표시만 담당).
- **체크무늬 배경**: `.canvas-wrapper`에 `background-image: linear-gradient(45deg, var(--checker-a) 25%, transparent 25%), linear-gradient(-45deg, var(--checker-a) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--checker-a) 75%), linear-gradient(-45deg, transparent 75%, var(--checker-a) 75%); background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0; background-color: var(--checker-b);` 형태의 표준 CSS 체크무늬 패턴을 적용해, 투명한(칠하지 않은) 칸에서 바둑판 무늬가 비쳐 보이게 한다.
- **팔레트**: `.palette { display: flex; flex-wrap: wrap; gap: 0.4rem; }`, `.swatch { width: 1.75rem; height: 1.75rem; border-radius: 4px; border: 2px solid var(--border); cursor: pointer; }`, `.swatch.is-active { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }` — 태그 필터 칩(`tag-filter-chip.is-active`)과 같은 "선택됨" 표현 방식을 재사용한다.
- **툴바 버튼**: `.tool-btn`은 2048의 `.new-game-btn`과 동일한 스타일(배경 `var(--accent)` 또는 보더만 있는 보조 버튼, `border-radius: 6px`, `padding`, `cursor: pointer`)을 재사용하되, 지우개/전체 지우기는 보조(outline) 스타일로, "PNG로 저장"만 `.tool-btn-primary`로 강조 배경을 준다.
- **반응형 브레이크포인트**: `main.css`와 2048이 사용하는 `@media (max-width: 600px)` 기준을 그대로 따라, 툴바를 `flex-direction: column`으로 세로 쌓고 팔레트 스와치 크기를 살짝 줄인다.
- **다크모드**: 캔버스 자체는 투명 배경이라 별도 대응이 필요 없고, 툴바/버튼/래퍼 테두리는 모두 `main.css`의 `var(--bg-subtle)`/`var(--border)`/`var(--text)`를 재사용해 나머지 페이지와 시각적 통일감을 유지한다.

## 6. 빌드 통합 방법

### 6.1 `build/config.js` 수정

`nav` 배열에 픽셀 아트 링크를 추가한다.

```js
nav: [
  { label: '홈', href: '/' },
  { label: '태그', href: '/tags/' },
  { label: '2048', href: '/games/2048/' },
  { label: '픽셀 아트', href: '/tools/pixel-art/' },
],
```

`templates.js`의 `layout()`이 이미 `nav`를 순회해 `${basePath}${item.href}` 링크를 생성하므로, 이 한 줄 추가만으로 `dist/index.html`, `dist/posts/*/index.html`, `dist/tags/*/index.html` 등 빌드되는 모든 페이지 헤더에 자동으로 "픽셀 아트" 메뉴가 생긴다. 반대로 `src/games/2048/index.html`과 `src/tools/pixel-art/index.html`은 `layout()`을 거치지 않는 손으로 쓴 정적 파일이므로, 3절에서 설계한 대로 동일한 nav 링크를 두 파일 모두에 직접 하드코딩해 둔다(서로를 포함해 4개 항목으로 유지 — `config.js`의 `nav`와 내용을 일치시켜야 함).

### 6.2 `build/build.js` 수정

2절에서 설계한 대로 `copyStaticAssets()`를 `STATIC_ASSET_DIRS` 배열 기반 반복문으로 일반화하고, 배열에 `'tools'`를 추가한다. `src/tools/pixel-art/{index.html,style.css,editor.js}`가 그대로 `dist/tools/pixel-art/`로 복사되어 사이트에서 `/tools/pixel-art/`로 접근 가능해진다. `build()` 함수 본문과 게시글 관련 로직(`readPosts()`, `validateUniqueSlugs()`, 검색 인덱스 생성 등)은 전혀 변경하지 않는다.

### 6.3 배포(GitHub Pages 서브패스) 대응

`config.basePath`는 `templates.js`가 생성하는 페이지에서만 관여한다. `src/tools/pixel-art/index.html`은 3절에서 설계한 대로 모든 자산·링크를 상대 경로(`../../styles/main.css`, `../../`, `../../tags/`, `../../games/2048/`, `../../tools/pixel-art/`, 같은 디렉터리의 `style.css`/`editor.js`)로 작성했으므로 `BASE_PATH` 환경 변수 값과 무관하게 항상 올바르게 동작한다(2048과 동일한 이유 — 별도의 문자열 치환 로직 불필요).

## 7. 기존 코드 스타일과의 일관성

- **주석 최소화**: `editor.js`는 `build/*.js`처럼 함수마다 설명 주석을 달지 않고, "왜 이렇게 했는가"가 자명하지 않은 지점(예: `clientToCell`의 비율 변환 이유, PNG 저장 시 별도 확대 로직이 필요 없는 이유)에만 짧게 남긴다.
- **클라이언트 JS 컨벤션 일치**: `src/scripts/*.js`, `src/games/2048/game.js`와 동일하게 IIFE + `var` + `function () {}`, `'use strict'` 없음 스타일로 `editor.js`를 작성한다. `build/*.js`(Node/CommonJS, `const`/`let`, `'use strict'`)의 스타일은 브라우저에 노출되는 `src/tools`에는 적용하지 않는다.
- **CSS 변수/다크모드 패턴 일치**: `main.css`가 쓰는 3단 구조(`:root` → `prefers-color-scheme` → `[data-theme]`)를 `style.css`의 체크무늬 배경 변수에도 동일하게 적용한다.
- **프레임워크/번들러 금지 준수**: Canvas 2D API, `<input type="color">`, `toBlob` 등 브라우저 표준 API만 사용하고 별도 드로잉 라이브러리나 상태관리 라이브러리를 도입하지 않는다. `npm run build`가 여전히 Node 내장 모듈 + 기존 `build/` 스크립트만으로 동작한다.
- **파일/URL 네이밍 일치**: `/games/2048/`과 마찬가지로 `/tools/pixel-art/`도 트레일링 슬래시 디렉터리 규칙을 따른다.
- **재사용 가능한 일반화**: `copyStaticAssets()`를 배열 기반으로 일반화해 두었으므로, 이후 세 번째 정적 도구/게임이 추가되더라도 `build/build.js` 수정 없이 `STATIC_ASSET_DIRS` 배열에 디렉터리 이름 한 줄만 추가하면 된다.

## 8. 이번 계획에서 의도적으로 제외한 것

- 실행취소(undo)/다시하기(redo) 기능
- 그림을 localStorage 등에 자동 저장/복원하는 기능
- 격자 크기 변경(16x16 고정), 레이어, 그리기 도구 다양화(선/사각형/채우기 등) — 요구사항에 없는 범위
