---
title: 다크 모드 구현 노트
date: 2026-03-01
tags: [javascript, css]
description: CSS 커스텀 프로퍼티와 localStorage로 다크 모드를 구현한 방법.
---

# 다크 모드 구현 노트

`prefers-color-scheme` 미디어 쿼리와 수동 토글 버튼을 함께 지원하려면 CSS 커스텀 프로퍼티를 `:root`에 정의하고, `data-theme` 속성으로 오버라이드하는 방식이 가장 간단하다.

## 핵심 아이디어

1. 시스템 설정을 기본값으로 사용
2. 사용자가 버튼을 누르면 `localStorage`에 선택을 저장
3. 다음 방문 시 저장된 값을 우선 적용해 깜빡임을 방지

```css
:root[data-theme='dark'] {
  --bg: #14161a;
  --text: #e8e8e8;
}
```

간단하지만 효과적인 패턴이다.
