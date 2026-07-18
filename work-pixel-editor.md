# Work 지침: 픽셀 아트 에디터 구현

## 참고 문서
구현 전에 반드시 `D:\project\my_blog\spec-pixel-editor.md`를 전체 읽고, 거기 설계된 내용을 그대로 따라 구현해라. 설계를 바꾸고 싶은 부분이 있어도 임의로 바꾸지 말고 spec 문서에 쓰인 대로 구현해라. 참고로 `src/games/2048/`이 동일한 패턴(독립 정적 페이지, posts 파이프라인 미사용)으로 이미 구현되어 있으니 코드 스타일과 구조를 참고해라.

## 수정 가능 범위 (이 파일들만 만들거나 수정한다)
- `src/tools/pixel-art/index.html` (신규 생성)
- `src/tools/pixel-art/style.css` (신규 생성)
- `src/tools/pixel-art/editor.js` (신규 생성)
- `build/config.js` (기존 파일 수정 — nav 배열에 픽셀 아트 항목 추가만)
- `build/build.js` (기존 파일 수정 — `copyStaticAssets()`를 `STATIC_ASSET_DIRS` 배열 기반으로 일반화하고 `'tools'` 추가)
- `src/games/2048/index.html` (기존 파일 수정 — nav에 "픽셀 아트" 링크 한 줄 추가만. spec-pixel-editor.md 3절/6.1절 참고: 손으로 쓴 두 정적 페이지의 nav를 서로 일치시켜야 한다)

위 6개 파일 외에는 어떤 파일도 만들거나 수정하지 마라. 특히 `posts/`, `build/frontmatter.js`, `build/markdown-parser.js`, `build/templates.js`, `src/styles/main.css`, `src/scripts/theme-toggle.js`, `src/games/2048/style.css`, `src/games/2048/game.js` 등은 절대 건드리지 마라.

## 구현 요구사항 (spec-pixel-editor.md 요약, 세부는 spec 원문 기준)
1. **HTML**: spec 3절의 마크업 구조 그대로. `<canvas id="pixel-canvas" width="384" height="384">`. nav에 홈/태그/2048/픽셀아트 4개 항목 모두 하드코딩.
2. **editor.js**: Canvas 2D API 기반. 16x16 `pixels` 상태 배열, `clientToCell()`로 좌표 변환(마우스+터치 공통), 마우스(mousedown/mousemove + window의 mouseup)와 터치(touchstart/touchmove/touchend, preventDefault) 드래그 그리기, 색상 팔레트(미리 정의된 스와치 + `<input type="color">` 커스텀), 지우개 토글, 전체 지우기(`confirm()` 확인 필수), PNG 저장(`canvas.toBlob` + `URL.createObjectURL` + 임시 `<a download>`). `ctx.imageSmoothingEnabled = false` 필수.
   - 코드 스타일: `src/scripts/*.js`, `src/games/2048/game.js`와 동일하게 IIFE + `var` + `function () {}`, `'use strict'` 없음. 주석은 자명하지 않은 이유가 있을 때만 최소한으로.
3. **style.css**: `main.css`의 다크모드 3단 구조를 체크무늬 배경 변수에 적용. 캔버스 반응형(`width: 100%; max-width: 384px; height: auto; aspect-ratio: 1; image-rendering: pixelated; touch-action: none;`). 팔레트/툴바 레이아웃, 600px 이하 반응형.
4. **build/config.js**: `nav` 배열에 `{ label: '픽셀 아트', href: '/tools/pixel-art/' }` 추가.
5. **build/build.js**: `copyStaticAssets()`를 spec 2.2절의 `STATIC_ASSET_DIRS = ['styles', 'scripts', 'games', 'tools']` 배열 + 반복문 형태로 일반화.

## 완료 후 확인
- `npm run build`를 실행해 에러 없이 빌드되는지 확인해라.
- `dist/tools/pixel-art/index.html`, `style.css`, `editor.js`가 생성됐는지 확인해라.
- `dist/index.html`, `dist/games/2048/index.html` 헤더에 "픽셀 아트" 네비 링크가 추가됐는지, `dist/tools/pixel-art/index.html` 헤더에 "2048" 링크가 있는지 확인해라.
- `dist/games/2048/index.html`이 여전히 정상적으로 빌드/복사되는지(회귀 없는지) 확인해라.
- 실제 브라우저 동작 테스트(그리기/팔레트/저장)는 이후 Review 단계에서 별도로 하므로 여기서는 하지 않아도 된다. 다만 빌드가 깨지지 않는지는 반드시 확인해라.

## 작업 범위 외
- README, 문서 파일 추가 금지.
- spec-pixel-editor.md 수정 금지 (참고만 하고 그대로 둔다).
- 이 work-pixel-editor.md 파일 수정 금지.
