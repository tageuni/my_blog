---
title: 디바운스와 스로틀, 언제 무엇을 쓸까
date: 2026-07-19
tags: [javascript, performance]
description: 스크롤·리사이즈 같은 잦은 이벤트를 다루는 두 가지 제어 기법을 비교한다.
---

# 디바운스와 스로틀, 언제 무엇을 쓸까

`scroll`, `resize`, `input` 같은 이벤트는 아주 짧은 시간에 수십, 수백 번씩 발생한다. 이벤트 핸들러 안에서 DOM을 읽고 쓰는 무거운 작업을 하면 화면이 버벅이기 쉽다. 이럴 때 쓰는 대표적인 기법이 디바운스(debounce)와 스로틀(throttle)이다.

## 디바운스: 잠잠해질 때까지 기다린다

디바운스는 이벤트가 연속으로 발생하는 동안은 함수를 실행하지 않다가, 마지막 이벤트 이후 일정 시간이 지나야 딱 한 번 실행한다. 검색창에 타이핑할 때 자동완성 요청을 매 글자마다 보내지 않고, 타이핑이 멈춘 뒤에만 보내고 싶을 때 적합하다.

```js
function debounce(fn, delay) {
  let timerId;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}

input.addEventListener("input", debounce(handleSearch, 300));
```

새 이벤트가 들어올 때마다 이전 타이머를 취소하기 때문에, 입력이 계속되는 동안에는 `handleSearch`가 한 번도 실행되지 않는다.

## 스로틀: 일정 간격으로 한 번씩 실행한다

스로틀은 이벤트가 아무리 자주 발생해도 정해진 간격마다 딱 한 번만 함수를 실행한다. 스크롤 위치에 따라 헤더 스타일을 바꾸거나, 무한 스크롤에서 다음 페이지를 로드할 시점을 체크하는 것처럼 "계속 반응은 해야 하지만 너무 자주는 곤란한" 상황에 어울린다.

```js
function throttle(fn, interval) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

window.addEventListener("scroll", throttle(handleScroll, 200));
```

디바운스와 달리 스로틀은 이벤트가 계속 발생하는 동안에도 일정 주기로 실행이 보장된다.

## 선택 기준

- 마지막 입력값만 중요하고 중간 과정은 무시해도 된다면 → 디바운스
- 이벤트가 진행되는 동안에도 주기적으로 반응해야 한다면 → 스로틀

두 기법 모두 목적은 같다. 브라우저에게 일을 덜 시켜서 버벅임을 줄이는 것이다. `lodash` 같은 라이브러리에도 `debounce`, `throttle` 함수가 있지만, 위 코드처럼 직접 구현해도 몇 줄이면 충분하다.
