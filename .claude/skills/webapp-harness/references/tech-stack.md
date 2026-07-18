# 기술 스택 컨벤션 (my_blog 기준)

Work 단계 지침 파일을 쓸 때, 새로 만드는 코드가 기존 코드와 스타일이 어긋나지 않도록 이 문서를 참고시킨다. 스택 자체(정적 Node.js 사이트 생성기)가 다른 프로젝트에서는 이 문서 대신 그 프로젝트의 실제 컨벤션을 관찰해서 새로 정리하면 된다 — 여기 적힌 건 "이 프로젝트에서는 이렇게 한다"는 관찰 결과지, 모든 프로젝트에 강제할 규칙이 아니다.

## 전체 구조

```
posts/                 마크다운 포스트 원본
src/
  styles/main.css       다크모드(3단) + 반응형, 템플릿 페이지 전용
  scripts/               *.js, 템플릿 페이지에 <script>로 로드
  games/<name>/          손으로 쓴 독립 정적 페이지
  tools/<name>/          손으로 쓴 독립 정적 페이지
build/
  build.js               엔트리포인트
  config.js               siteTitle, nav, basePath
  templates.js            layout() 등 HTML 생성 함수 — 마크다운 파이프라인 전용
  markdown-parser.js, frontmatter.js
dist/                   빌드 산출물 (git 무시)
.github/workflows/deploy.yml   BASE_PATH=/<repo-name>로 빌드 후 GitHub Pages 배포
```

빌드는 프레임워크나 번들러 없이 순수 Node.js 스크립트(`build/build.js`)가 마크다운을 정적 HTML로 변환하는 구조다. 프론트엔드 코드는 순수 HTML/CSS/JS.

## 손으로 쓰는 독립 웹앱(게임/도구) 통합 패턴

마크다운 파이프라인을 안 타는, 완전히 손으로 짠 페이지(게임, 도구 등)를 추가할 때:

1. `src/games/<name>/` 또는 `src/tools/<name>/` 아래 `index.html`, `style.css`, `<name>.js`를 새로 만든다. `templates.js`의 `layout()`을 쓰지 않고 `<head>`/`<header>`/nav를 직접 하드코딩한다.
2. 모든 에셋/nav 링크는 **상대경로**(`../../styles/main.css` 등)로 쓴다 — GitHub Pages처럼 서브패스로 배포될 때(`BASE_PATH` 환경변수) basePath와 무관하게 동작하게 하기 위해서다.
3. `build/build.js`의 `STATIC_ASSET_DIRS` 배열(예: `['styles', 'scripts', 'games', 'tools']`)에 새 최상위 디렉터리를 추가하면, `copyStaticAssets()`가 자동으로 `dist/`에 그대로 복사한다.
4. nav에 새 항목을 두 군데 추가한다: `build/config.js`의 `nav` 배열(마크다운 파이프라인을 타는 모든 템플릿 페이지용), 그리고 **기존에 손으로 쓴 다른 정적 페이지들의 헤더에도** 링크를 하드코딩해서 서로 이동 가능하게 한다 — 이 두 번째를 빼먹으면 게임 페이지에서 새로 만든 도구 페이지로 못 넘어가는 식의 비대칭이 생긴다.

## 다크모드 3단 CSS 패턴

```css
:root { --bg: #fff; /* ... 라이트 기본값 */ }

@media (prefers-color-scheme: dark) {
  :root { --bg: #14161a; /* ... 시스템이 다크면 자동 적용 */ }
}

:root[data-theme='light'] { /* 라이트 명시적 강제 */ }
:root[data-theme='dark']  { /* 다크 명시적 강제, 토글 버튼이 클릭 시 이 속성을 설정 */ }
```
`localStorage`의 `theme` 키에 사용자가 명시적으로 고른 값을 저장하고, 페이지 로드 시 `<html>`의 `data-theme` 속성에 반영한다. 새 기능마다 이 변수들(`--bg`, `--text`, `--accent` 등)을 그 페이지의 CSS에서도 동일하게 정의해서 다크모드가 전체 사이트에서 일관되게 보이도록 한다.

## 브라우저 JS 스타일 vs 빌드 스크립트 스타일

이 프로젝트는 **의도적으로** 두 스타일을 구분해서 쓴다:

- **브라우저에서 실행되는 JS** (`src/scripts/*.js`, `src/games/*/*.js`, `src/tools/*/*.js`): IIFE로 감싸고, `var` 선언, `function () {}` 표현식, `'use strict'` 없음.
- **Node에서 실행되는 빌드 스크립트** (`build/*.js`): CommonJS(`require`/`module.exports`), `const`/`let`, `'use strict'` 있음.

새 코드를 어디에 두느냐에 따라 맞는 스타일을 따른다 — 섞으면 리뷰에서 바로 눈에 띄는 불일치가 된다.

## 좌표/입력 처리 공통 패턴 (그리기형 UI를 또 만든다면)

- 마우스+터치 통합: `mousedown`/`touchstart` → 공통 핸들러, `mousemove`/`touchmove` → 공통 핸들러, `mouseup`은 `window`에 바인딩(캔버스 밖에서 놓아도 감지), `touchend`(+ 가능하면 `touchcancel`도) → 공통 핸들러. 터치 이벤트는 `event.preventDefault()` + CSS `touch-action: none`으로 스크롤/줌 충돌을 막는다.
- 반응형으로 축소된 캔버스에서 좌표를 변환할 땐 `getBoundingClientRect()`의 실제 렌더링 크기와 캔버스 intrinsic 크기의 비율로 스케일링한다 (`clientToCell` 류 함수).

## 접근성 기본값

- 전역 CSS에 `a:focus-visible, button:focus-visible, input:focus-visible { outline: ...; }` 를 반드시 넣는다 — 키보드 사용자가 포커스 위치를 알 수 있게.
- 동적으로 내용이 바뀌는 영역(검색 결과 등)에는 `aria-live="polite"`를 붙인다.
- `<head>`에 favicon(간단한 이모지 SVG data URI로도 충분)과 기본 OG 메타 태그(`og:title`, `og:description`, `og:type`)를 넣어 404/SEO 결함을 예방한다.

## 배포

GitHub Actions(`.github/workflows/deploy.yml`)가 `BASE_PATH=/<repo-name>`을 환경변수로 주고 빌드한 뒤 GitHub Pages에 올린다. `config.js`의 `basePath`가 이 값을 읽어서 모든 템플릿 페이지의 링크 앞에 붙인다. 손으로 쓴 정적 페이지는 상대경로를 쓰므로 이 값과 무관하게 동작한다(위 통합 패턴 참고).
