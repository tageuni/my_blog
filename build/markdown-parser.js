'use strict';

/**
 * Small hand-written Markdown -> HTML converter. Not a full CommonMark
 * implementation - covers the common syntax used in blog posts:
 * headings, paragraphs, bold/italic, links, images, ordered/unordered
 * lists (single level), fenced code blocks, inline code, blockquotes,
 * horizontal rules. Explicitly unsupported: nested lists, tables,
 * footnotes, task checkboxes, raw HTML passthrough, reference links.
 */

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    // \p{L}/\p{N} (Unicode letter/number) instead of a-z0-9 so non-Latin
    // titles (e.g. Korean) don't get stripped down to an empty string.
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const HR_RE = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;
const FENCE_RE = /^```\s*(\S*)\s*$/;
const UNORDERED_ITEM_RE = /^[-*+]\s+(.*)$/;
const ORDERED_ITEM_RE = /^\d+\.\s+(.*)$/;
const BLOCKQUOTE_RE = /^>\s?(.*)$/;

const STASH_PREFIX = 'STASH';
const STASH_SUFFIX = '';

/**
 * Pass 1: split the raw body into block-level nodes.
 */
function parseBlocks(lines) {
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      const lang = fenceMatch[1] || '';
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: 'code', lang, text: codeLines.join('\n') });
      continue;
    }

    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] });
      i++;
      continue;
    }

    if (HR_RE.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    if (BLOCKQUOTE_RE.test(line)) {
      const quoteLines = [];
      while (i < lines.length && BLOCKQUOTE_RE.test(lines[i])) {
        quoteLines.push(lines[i].match(BLOCKQUOTE_RE)[1]);
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    if (UNORDERED_ITEM_RE.test(line) || ORDERED_ITEM_RE.test(line)) {
      const ordered = ORDERED_ITEM_RE.test(line);
      const itemRe = ordered ? ORDERED_ITEM_RE : UNORDERED_ITEM_RE;
      const items = [];
      while (i < lines.length && itemRe.test(lines[i])) {
        items.push(lines[i].match(itemRe)[1]);
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Paragraph: accumulate consecutive plain lines.
    const paragraphLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !FENCE_RE.test(lines[i]) &&
      !HEADING_RE.test(lines[i]) &&
      !HR_RE.test(lines[i]) &&
      !BLOCKQUOTE_RE.test(lines[i]) &&
      !UNORDERED_ITEM_RE.test(lines[i]) &&
      !ORDERED_ITEM_RE.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

// Blocks link/image URLs using script-executing schemes (e.g. `javascript:`)
// so a post body can't turn `[text](javascript:...)` into a clickable XSS payload.
const DANGEROUS_URL_SCHEME_RE = /^\s*(javascript|vbscript|data):/i;

function sanitizeUrl(url) {
  return DANGEROUS_URL_SCHEME_RE.test(url) ? '#' : url;
}

/**
 * Pass 2: convert inline Markdown within a block's text to HTML.
 * Already-produced HTML fragments (code spans, links, images, bold,
 * italic) are stashed behind placeholder tokens wrapped in a control
 * character that never appears in normal text, so later passes never
 * re-interpret generated markup or collide with digits/URLs in the
 * content. Restored in reverse (last-stashed-first) order at the end
 * so nested stashed HTML (e.g. a code span inside bold text) resolves
 * correctly.
 */
function parseInline(rawText) {
  const stash = [];
  const stashHtml = (html) => {
    const token = STASH_PREFIX + stash.length + STASH_SUFFIX;
    stash.push(html);
    return token;
  };

  let text = escapeHtml(rawText);

  // Inline code spans (must run before bold/italic so `**not bold**` is left alone).
  text = text.replace(/`([^`]+)`/g, (_, code) => stashHtml(`<code>${code}</code>`));

  // Images before links - overlapping syntax, images use a leading "!".
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) =>
    stashHtml(`<img src="${sanitizeUrl(url)}" alt="${alt}">`)
  );

  // Links.
  text = text.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (_, label, url) =>
    stashHtml(`<a href="${sanitizeUrl(url)}">${label}</a>`)
  );

  // Bold (must run before italic so ** isn't partially consumed by the single-* rule).
  text = text.replace(/\*\*([^*]+)\*\*/g, (_, bold) => stashHtml(`<strong>${bold}</strong>`));
  text = text.replace(/__([^_]+)__/g, (_, bold) => stashHtml(`<strong>${bold}</strong>`));

  // Italic.
  text = text.replace(/\*([^*]+)\*/g, (_, em) => stashHtml(`<em>${em}</em>`));
  text = text.replace(/_([^_]+)_/g, (_, em) => stashHtml(`<em>${em}</em>`));

  for (let idx = stash.length - 1; idx >= 0; idx--) {
    const token = STASH_PREFIX + idx + STASH_SUFFIX;
    text = text.split(token).join(stash[idx]);
  }

  return text;
}

function renderBlock(block, usedIds) {
  switch (block.type) {
    case 'heading': {
      const inline = parseInline(block.text);
      const baseId = slugify(block.text) || 'section';
      let id = baseId;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${baseId}-${suffix++}`;
      }
      usedIds.add(id);
      return `<h${block.level} id="${id}">${inline}</h${block.level}>`;
    }
    case 'paragraph':
      return `<p>${parseInline(block.text)}</p>`;
    case 'code': {
      const langClass = block.lang ? ` class="language-${block.lang}"` : '';
      return `<pre><code${langClass}>${escapeHtml(block.text)}</code></pre>`;
    }
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items.map((item) => `<li>${parseInline(item)}</li>`).join('');
      return `<${tag}>${items}</${tag}>`;
    }
    case 'blockquote':
      return `<blockquote><p>${parseInline(block.text)}</p></blockquote>`;
    case 'hr':
      return '<hr>';
    default:
      return '';
  }
}

function parseMarkdown(body) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks = parseBlocks(lines);
  const usedIds = new Set();
  return blocks.map((block) => renderBlock(block, usedIds)).join('\n');
}

/**
 * Strips HTML tags from rendered content to produce plain text, used for
 * excerpts and the search index.
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { parseMarkdown, escapeHtml, slugify, stripHtml };
