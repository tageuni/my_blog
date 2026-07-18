# Review 지침: 2048 게임 테스트

## 배경
`spec.md`에 설계된 2048 게임이 `work-2048.md` 지침에 따라 구현되었다. 새로 생긴 파일은 `src/games/2048/index.html`, `src/games/2048/style.css`, `src/games/2048/game.js`이고, `build/config.js`(nav 추가)와 `build/build.js`(정적 자산 복사)가 수정되었다.

## 할 일
1. `spec.md`를 읽고 구현이 설계와 맞는지 파악한다.
2. `src/games/2048/index.html`, `src/games/2048/style.css`, `src/games/2048/game.js`, `build/config.js`, `build/build.js`의 실제 코드를 읽어 검토한다.
3. `npm run build`를 실행해 정상 빌드되는지 확인한다.
4. HTTP 서버로 `dist/`를 서빙하고(예: `npx http-server dist -p 8080` 또는 Node 내장 방식), 브라우저 도구(preview_start / navigate / computer)로 `http://localhost:8080/games/2048/`에 접속해 실제로 플레이 테스트를 해라:
   - 방향키(위/아래/왼쪽/오른쪽)로 타일이 밀리고 합쳐지는지
   - 점수가 올라가는지, 새 게임 후에도 최고 점수가 유지되는지 (localStorage)
   - "새 게임" 버튼이 보드를 리셋하는지
   - 다크모드 토글이 동작하고 타일 색상도 다크모드에 맞게 바뀌는지
   - 모바일 크기(예: 375x812)로 리사이즈했을 때 레이아웃이 깨지지 않는지, 보드가 화면 안에 들어오는지
   - 콘솔 에러가 없는지 (read_console_messages)
5. 코드 리뷰 관점에서 버그 가능성도 점검해라: 이동/병합 로직에서 3연속 병합이 실제로 방지되는지, moved가 false일 때 새 타일이 생성되지 않는지, 승리/패배 판정 조건, 오버레이 표시/숨김 로직 등을 코드 레벨에서 확인해라.
6. 발견한 문제가 있으면 실제로 재현되는지 검증하고, 심각도를 판단해라.

## 결과물
`D:\project\my_blog\review.md`에 다음 형식으로 작성해라:
- 요약 (정상 동작 여부 총평)
- 테스트한 항목과 결과 (체크리스트 형태)
- 발견된 버그/이슈 (있다면 파일:라인, 재현 방법, 심각도 포함. 없으면 "없음"이라고 명시)
- 개선 제안 (있다면, 필수는 아님)

## 범위
이 리뷰 작업에서는 코드를 수정하지 마라. 오직 테스트와 review.md 작성만 한다. 버그를 발견해도 고치지 말고 review.md에 기록만 해라.
