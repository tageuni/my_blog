'use strict';

module.exports = {
  siteTitle: 'My Blog',
  siteDescription: '마크다운으로 쓰는 블로그',
  // Root-relative base path. Empty for local dev / a root-domain deploy.
  // Set the BASE_PATH env var at build time for a subpath deploy (e.g.
  // GitHub Pages project pages serve at https://user.github.io/repo/, so
  // CI sets BASE_PATH=/repo before running the build).
  basePath: process.env.BASE_PATH || '',
  nav: [
    { label: '홈', href: '/' },
    { label: '태그', href: '/tags/' },
    { label: '2048', href: '/games/2048/' },
    { label: '픽셀 아트', href: '/tools/pixel-art/' },
  ],
};
