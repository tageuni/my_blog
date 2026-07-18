'use strict';

const { escapeHtml, slugify } = require('./markdown-parser');

function formatDate(dateStr) {
  return dateStr;
}

function tagChips(tags, basePath, { active } = {}) {
  if (!tags || !tags.length) return '';
  return tags
    .map((tag) => {
      const tagSlug = slugify(tag);
      const activeClass = active === tag ? ' is-active' : '';
      return `<a class="tag-chip${activeClass}" href="${basePath}/tags/${tagSlug}/" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</a>`;
    })
    .join('');
}

function postListItem(post, basePath) {
  const tagList = (post.tags || []).map((t) => escapeHtml(t)).join(',');
  return `
    <li class="post-item" data-tags="${tagList}">
      <a class="post-item-title" href="${basePath}${post.url}">${escapeHtml(post.title)}</a>
      <div class="post-item-meta">
        <time datetime="${post.date}">${formatDate(post.date)}</time>
        <span class="post-item-tags">${tagChips(post.tags, basePath)}</span>
      </div>
      <p class="post-item-excerpt">${escapeHtml(post.excerptText)}</p>
    </li>`;
}

function layout({ title, description, bodyHtml, basePath, nav, siteTitle, activeHref }) {
  const navHtml = nav
    .map((item) => {
      const activeClass = item.href === activeHref ? ' is-active' : '';
      return `<a class="nav-link${activeClass}" href="${basePath}${item.href}">${escapeHtml(item.label)}</a>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>%F0%9F%93%9D</text></svg>">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="${basePath}/styles/main.css">
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
    <a class="site-title" href="${basePath}/">${escapeHtml(siteTitle)}</a>
    <nav class="site-nav">${navHtml}</nav>
    <div class="site-header-actions">
      <div class="search-box">
        <input type="search" id="search-input" placeholder="검색..." aria-label="글 검색">
        <ul id="search-results" class="search-results" aria-live="polite" hidden></ul>
      </div>
      <button id="theme-toggle" class="theme-toggle" type="button" aria-label="다크 모드 전환">🌓</button>
    </div>
  </div>
</header>
<main class="site-main">
${bodyHtml}
</main>
<footer class="site-footer">
  <p>&copy; ${new Date().getFullYear()} ${escapeHtml(siteTitle)}</p>
</footer>
<script src="${basePath}/scripts/theme-toggle.js"></script>
<script src="${basePath}/scripts/tag-filter.js"></script>
<script src="${basePath}/scripts/search.js" data-base-path="${basePath}"></script>
</body>
</html>
`;
}

function postPage(post, config) {
  const bodyHtml = `
<article class="post">
  <h1 class="post-title">${escapeHtml(post.title)}</h1>
  <div class="post-meta">
    <time datetime="${post.date}">${formatDate(post.date)}</time>
    <span class="post-tags">${tagChips(post.tags, config.basePath)}</span>
  </div>
  <div class="post-content">
${post.contentHtml}
  </div>
  <p class="post-back"><a href="${config.basePath}/">&larr; 모든 글 보기</a></p>
</article>`;

  return layout({
    title: `${post.title} - ${config.siteTitle}`,
    description: post.description,
    bodyHtml,
    basePath: config.basePath,
    nav: config.nav,
    siteTitle: config.siteTitle,
    activeHref: null,
  });
}

function indexPage(posts, allTags, config) {
  const items = posts.map((post) => postListItem(post, config.basePath)).join('\n');
  const chips = allTags
    .map((tag) => `<button class="tag-filter-chip" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`)
    .join('');

  const bodyHtml = `
<section class="post-list-section">
  <h1>모든 글</h1>
  <div class="tag-filter-bar">
    <button class="tag-filter-chip is-active" type="button" data-tag="">전체</button>
    ${chips}
  </div>
  <ul class="post-list">
${items}
  </ul>
</section>`;

  return layout({
    title: config.siteTitle,
    description: config.siteDescription,
    bodyHtml,
    basePath: config.basePath,
    nav: config.nav,
    siteTitle: config.siteTitle,
    activeHref: '/',
  });
}

function tagPage(tagName, posts, config) {
  const items = posts.map((post) => postListItem(post, config.basePath)).join('\n');
  const bodyHtml = `
<section class="post-list-section">
  <h1>태그: ${escapeHtml(tagName)}</h1>
  <p><a href="${config.basePath}/tags/">&larr; 모든 태그 보기</a></p>
  <ul class="post-list">
${items}
  </ul>
</section>`;

  return layout({
    title: `${tagName} - ${config.siteTitle}`,
    description: `${tagName} 태그가 붙은 글 목록`,
    bodyHtml,
    basePath: config.basePath,
    nav: config.nav,
    siteTitle: config.siteTitle,
    activeHref: '/tags/',
  });
}

function tagIndexPage(tagMap, config) {
  const tagNames = Object.keys(tagMap).sort((a, b) => a.localeCompare(b));
  const items = tagNames
    .map((tag) => {
      const tagSlug = slugify(tag);
      const count = tagMap[tag].length;
      return `<li><a href="${config.basePath}/tags/${tagSlug}/">${escapeHtml(tag)}</a> <span class="tag-count">(${count})</span></li>`;
    })
    .join('\n');

  const bodyHtml = `
<section class="post-list-section">
  <h1>모든 태그</h1>
  <ul class="tag-index-list">
${items}
  </ul>
</section>`;

  return layout({
    title: `태그 - ${config.siteTitle}`,
    description: '모든 태그 목록',
    bodyHtml,
    basePath: config.basePath,
    nav: config.nav,
    siteTitle: config.siteTitle,
    activeHref: '/tags/',
  });
}

module.exports = { layout, postPage, indexPage, tagPage, tagIndexPage, postListItem };
