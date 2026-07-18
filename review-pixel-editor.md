# Review 지침: 픽셀 아트 에디터 테스트

## 배경
`spec-pixel-editor.md`에 설계된 픽셀 아트 에디터가 `work-pixel-editor.md` 지침에 따라 구현되었다. 새로 생긴 파일은 `src/tools/pixel-art/index.html`, `style.css`, `editor.js`이고, `build/config.js`(nav 추가), `build/build.js`(정적 자산 복사 일반화), `src/games/2048/index.html`(nav 링크 추가)가 수정되었다.

## 할 일
1. `spec-pixel-editor.md`를 읽고 구현이 설계와 맞는지 파악한다.
2. `src/tools/pixel-art/index.html`, `style.css`, `editor.js`, `build/config.js`, `build/build.js`, `src/games/2048/index.html`의 실제 코드를 읽어 검토한다.
3. `npm run build`를 실행해 정상 빌드되는지 확인한다. `dist/games/2048/`도 여전히 정상 생성되는지(회귀 없는지) 함께 확인한다.
4. HTTP 서버로 `dist/`를 서빙하고(예: `npx http-server dist -p 8080`) 브라우저 도구로 `http://localhost:8080/tools/pixel-art/`에 접속해 실제로 사용 테스트를 해라:
   - 마우스 클릭으로 칸 하나에 색이 칠해지는지
   - 마우스를 누른 채 드래그하면 지나가는 여러 칸에 연속으로 칠해지는지
   - 팔레트 스와치를 클릭하면 그리기 색이 바뀌는지 (is-active 표시 포함)
   - 커스텀 색상 피커(`<input type="color">`)로 색을 바꾸면 반영되는지
   - 지우개 도구를 켜고 칠해진 칸을 클릭/드래그하면 지워지는지 (다시 팔레트를 클릭하면 지우개가 꺼지는지)
   - "전체 지우기" 버튼이 확인창(confirm)을 띄우고, 확인 시 보드가 비는지
   - "PNG로 저장" 버튼을 눌렀을 때 다운로드가 트리거되는지 (read_network_requests 또는 콘솔로 확인 가능한 범위에서)
   - 다크모드 토글이 동작하고 체크무늬 배경 색이 다크모드에 맞게 바뀌는지
   - 모바일 크기(375x812)로 리사이즈했을 때 레이아웃이 깨지지 않는지, 캔버스가 화면 안에 들어오는지
   - 콘솔 에러가 없는지 (read_console_messages)
5. `http://localhost:8080/`(홈), `http://localhost:8080/games/2048/`에도 접속해 nav에 "픽셀 아트"/"2048" 링크가 정확히 노출되고 서로 이동 가능한지 확인한다.
6. 코드 리뷰 관점에서 버그 가능성도 점검해라: `clientToCell`의 좌표 변환이 캔버스가 반응형으로 축소됐을 때도 정확한지, 드래그 중 캔버스 밖으로 나갔다가 다시 들어왔을 때 그리기가 이어지는지, 터치 이벤트의 `preventDefault`가 스크롤을 제대로 막는지, PNG 저장 시 투명 배경이 의도대로(체크무늬가 섞이지 않고) 저장되는 구조인지 코드 레벨에서 확인해라.
7. 발견한 문제가 있으면 실제로 재현되는지 검증하고, 심각도를 판단해라.

## 결과물
`D:\project\my_blog\review-pixel-editor-report.md`에 다음 형식으로 작성해라:
- 요약 (정상 동작 여부 총평)
- 테스트한 항목과 결과 (체크리스트 형태)
- 발견된 버그/이슈 (있다면 파일:라인, 재현 방법, 심각도 포함. 없으면 "없음"이라고 명시)
- 개선 제안 (있다면, 필수는 아님)

## 범위
이 리뷰 작업에서는 코드를 수정하지 마라. 오직 테스트와 review-pixel-editor-report.md 작성만 한다. 버그를 발견해도 고치지 말고 문서에 기록만 해라.
